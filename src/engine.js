(async () => {
    let isTerminated = false;
    let pollCount = 0;
    
    // Config State
    let config = {
        interval: 800,
        mode: 'auto'
    };

    // Tracking State
    let currentInterval = 800;
    let isJobPosted = false;
    let isScheduleActive = false;
    let consecutiveErrors = 0;

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        window.dispatchEvent(new CustomEvent('SNIPER_LOG', { detail: { time, msg } }));
    };

    const getParam = (name) => {
        const regex = new RegExp('[?&]' + name + '=([^&#]*)');
        const results = regex.exec(window.location.href);
        return results ? decodeURIComponent(results[1]) : null;
    };

    let scheduleId = getParam('scheduleId');
    let jobId = getParam('jobId');
    if (scheduleId && scheduleId.includes('~')) scheduleId = scheduleId.split('~')[0];

    const locale = getParam('locale') || 'en-US';
    const domain = window.location.hostname;
    
    if (!scheduleId || !jobId) return;

    const SCH_URL = `https://${domain}/application/api/job/get-schedule-details/${scheduleId}?locale=${locale}`;
    const JOB_URL = `https://${domain}/application/api/job/${jobId}?locale=${locale}`;

    const findToken = () => {
        const containers = ['accessToken', 'idToken', 'sessionToken', 'HVH_ACCESS_TOKEN', 'auth_storage'];
        for (const c of containers) {
            const val = localStorage.getItem(c) || sessionStorage.getItem(c);
            if (val && val.includes('AQIC')) return val;
        }
        for (let i = 0; i < localStorage.length; i++) {
            const v = localStorage.getItem(localStorage.key(i));
            if (v && v.length > 300 && v.includes('AQIC')) return v;
        }
        return null;
    };

    const fastClick = () => {
        const triggerClick = () => {
            const button = document.querySelector('[data-test-component="StencilReactButton"]') || 
                           Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Select this job'));
            if (button) {
                ['mousedown', 'mouseup', 'click'].forEach(type => {
                    button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
                });
                return true;
            }
            return false;
        };

        if (triggerClick()) {
            addLog("Click successful!");
            return true;
        } else {
            addLog("Button not found, retrying...");
            // Retry every 50ms for 2 seconds (requirement #5)
            let retries = 0;
            const retryInterval = setInterval(() => {
                retries++;
                if (triggerClick() || retries > 40) {
                    clearInterval(retryInterval);
                    if (retries <= 40) addLog("Button found and clicked after retry.");
                }
            }, 50);
            return false;
        }
    };

    const poll = async () => {
        if (isTerminated) return;
        const token = findToken();
        if (!token) {
            window.dispatchEvent(new CustomEvent('SNIPER_STATUS', { detail: 'Error: Auth Expired' }));
            return;
        }

        const url = (pollCount % 2 === 0) ? SCH_URL : JOB_URL;
        pollCount++;

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': token, 'Accept': 'application/json' },
                credentials: 'include'
            });

            // Adaptive backoff logic (requirement #2)
            if (res.status === 429 || res.status === 403) {
                consecutiveErrors++;
                if (config.mode === 'auto') {
                    currentInterval = Math.min(3000, currentInterval + 400); // Gradual increase
                    addLog(`Rate limited (${res.status}). Slowing down to ${currentInterval}ms`);
                    updateLoop();
                }
                window.dispatchEvent(new CustomEvent('SNIPER_STATUS', { detail: `Rate Limited (${res.status})` }));
                return;
            }

            if (res.ok) {
                // Recovery logic if stable
                if (consecutiveErrors > 0) {
                    consecutiveErrors = 0;
                    if (config.mode === 'auto') {
                        currentInterval = Math.max(config.interval, currentInterval - 200);
                        addLog(`Connection stable. Recovering interval: ${currentInterval}ms`);
                        updateLoop();
                    }
                }

                const json = await res.json();
                const data = json?.data;

                if (url === SCH_URL) {
                    const status = data?.status;
                    const available = data?.laborDemandAvailableCount || 0;
                    
                    if (status === "ACTIVE" && available > 0) {
                        if (!isScheduleActive) { // Trigger only on change (requirement #4)
                            isScheduleActive = true;
                            addLog("Schedule AVAILABLE! Triggering click...");
                            fastClick();
                            isTerminated = true;
                            window.dispatchEvent(new CustomEvent('SNIPER_SUCCESS'));
                        }
                    }
                    window.dispatchEvent(new CustomEvent('SNIPER_STATUS', { detail: `Sch: ${status || 'N/A'} (${available})` }));
                } else {
                    const status = data?.postingStatus;
                    if (status === "POSTED" && !isJobPosted) {
                        isJobPosted = true;
                        addLog("Job POSTED detection active!");
                    }
                    window.dispatchEvent(new CustomEvent('SNIPER_STATUS', { detail: `Job: ${status || 'N/A'}` }));
                }
            }
        } catch (e) {
            addLog("Network failure. Retrying...");
        }
    };

    let timer;
    const updateLoop = () => {
        if (timer) clearInterval(timer);
        timer = setInterval(poll, currentInterval);
    };

    // Listen for config changes from popup
    window.addEventListener('SNIPER_CONFIG', (e) => {
        config = { ...config, ...e.detail };
        currentInterval = config.interval;
        addLog(`Config updated: ${currentInterval}ms (${config.mode} mode)`);
        updateLoop();
    });

    // Clean Stop (Requirement: Avoid tab refresh)
    window.addEventListener('SNIPER_STOP', () => {
        isTerminated = true;
        if (timer) clearInterval(timer);
        addLog("Sniper Engine STOPPED.");
    });

    updateLoop();
    addLog("Sniper Engine Initialized.");
})();
