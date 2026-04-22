(async () => {
    let isTerminated = false;
    
    // Config State
    let config = {
        interval: 800,
        mode: 'auto',
        currentSchedule: null,
        extraSchedules: []
    };

    // Tracking State
    let currentInterval = 800;
    let pollIndex = 0;
    let monitoredList = []; 
    let consecutiveErrors = 0;

    const updateUI = () => {
        window.dispatchEvent(new CustomEvent('SNIPER_STATUS_MULTI', { detail: monitoredList }));
    };

    const getParam = (name) => {
        const regex = new RegExp('[?&]' + name + '=([^&#]*)');
        const results = regex.exec(window.location.href);
        let id = results ? decodeURIComponent(results[1]) : null;
        if (id && id.includes('~')) id = id.split('~')[0];
        return id;
    };

    const SCH_ID = getParam('scheduleId');
    const JOB_ID = getParam('jobId');
    const domain = window.location.hostname;
    const locale = getParam('locale') || 'en-US';

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
            // Priority 1: Search by container class + button
            // Priority 2: Search all buttons for the exact "Select this job" text
            let button = document.querySelector('.selectJobButtonContainer button');
            
            if (!button || !button.textContent.includes('Select this job')) {
                button = Array.from(document.querySelectorAll('button'))
                        .find(el => el.textContent.trim().toLowerCase().includes('select this job'));
            }

            if (button) {
                // High-speed event simulation for Amazon's React architecture
                ['mousedown', 'mouseup', 'click'].forEach(type => {
                    button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
                });
                return true;
            }
            return false;
        };

        if (!triggerClick()) {
            let retries = 0;
            const retryInterval = setInterval(() => {
                retries++;
                if (triggerClick() || retries > 40) clearInterval(retryInterval);
            }, 50);
        }
    };

    const poll = async () => {
        if (isTerminated || monitoredList.length === 0) return;
        const token = findToken();
        if (!token) return;

        const target = monitoredList[pollIndex % monitoredList.length];
        pollIndex++;

        // Mark polling
        monitoredList.forEach(m => m.isPolling = false);
        target.isPolling = true;
        updateUI();

        // Determine URL based on ID type (JOB vs SCH)
        const isJob = target.id.startsWith('JOB-');
        const url = isJob 
            ? `https://${domain}/application/api/job/${target.id}?locale=${locale}`
            : `https://${domain}/application/api/job/get-schedule-details/${target.id}?locale=${locale}`;

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': token, 'Accept': 'application/json' },
                credentials: 'include'
            });

            if (res.status === 429 || res.status === 403) {
                consecutiveErrors++;
                if (config.mode === 'auto') {
                    currentInterval = Math.min(4000, currentInterval + 500);
                    updateLoop();
                }
                return;
            }

            if (res.ok) {
                if (consecutiveErrors > 0) {
                    consecutiveErrors = 0;
                    if (config.mode === 'auto') {
                        currentInterval = Math.max(config.interval, currentInterval - 200);
                        updateLoop();
                    }
                }

                const json = await res.json();
                const data = json?.data;
                
                // Extract status based on request type
                const status = isJob ? data?.postingStatus : data?.status;
                const available = isJob ? 1 : (data?.laborDemandAvailableCount || 0);

                target.status = status;
                updateUI();

                // Trigger ONLY if a schedule becomes active
                if (!isJob && status === "ACTIVE" && available > 0) {
                    fastClick();
                    isTerminated = true;
                    window.dispatchEvent(new CustomEvent('SNIPER_SUCCESS'));
                }
            }
        } catch (e) {}
    };

    let timer;
    const updateLoop = () => {
        if (timer) clearInterval(timer);
        const stepInterval = Math.max(100, currentInterval / monitoredList.length);
        timer = setInterval(poll, stepInterval);
    };

    const rebuildQueue = () => {
        const list = [];
        // 1. Add Master Job ID
        if (JOB_ID) {
            list.push({ id: JOB_ID, status: "Waiting", isCurrent: true, isPolling: false });
        }
        // 2. Add Current Page Schedule
        if (SCH_ID) {
            list.push({ id: SCH_ID, status: "Waiting", isCurrent: true, isPolling: false });
        }
        // 3. Add Extra Schedules
        if (config.extraSchedules) {
            config.extraSchedules.forEach(s => {
                if (s.scheduleId !== SCH_ID) {
                    list.push({ id: s.scheduleId, status: "Waiting", isCurrent: false, isPolling: false });
                }
            });
        }
        monitoredList = list;
        updateUI();
        updateLoop();
    };

    window.addEventListener('SNIPER_CONFIG', (e) => {
        config = { ...config, ...e.detail };
        currentInterval = config.interval || 800;
        rebuildQueue();
    });

    window.addEventListener('SNIPER_STOP', () => {
        isTerminated = true;
        if (timer) clearInterval(timer);
    });

    rebuildQueue();
})();
