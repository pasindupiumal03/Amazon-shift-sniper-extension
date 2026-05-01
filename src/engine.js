(async () => {
    let isTerminated = false;
    
    // Config State - Try to recover from script attribute first (most reliable)
    const selfScript = document.getElementById('sniper-engine');
    const embeddedConfig = selfScript ? JSON.parse(selfScript.getAttribute('data-config') || 'null') : null;
    
    let config = embeddedConfig || {
        interval: 800,
        clickInterval: 0,
        mode: 'auto',
        currentSchedule: null,
        extraSchedules: []
    };

    // Tracking State
    let currentInterval = config.interval || 800;
    let pollIndex = 0;
    let monitoredList = []; 
    let consecutiveErrors = 0;
    let is403Paused = false; // Blocks SNIPER_HEALTHY during 403 cooldown

    const updateUI = () => {
        window.dispatchEvent(new CustomEvent('SNIPER_STATUS_MULTI', { detail: monitoredList }));
    };

    const getParam = (name) => {
        const url = new URL(window.location.href);
        let val = url.searchParams.get(name);
        if (!val && url.hash.includes('?')) {
            const hashParams = new URLSearchParams(url.hash.split('?')[1]);
            val = hashParams.get(name);
        }
        if (val && val.includes('~')) val = val.split('~')[0];
        return val;
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
        return null;
    };

    // Deep Shadow DOM Search + Inner Element Hunter (Requirement: Filterable by keyword)
    const findButtonDeep = (root = document, targets = ['select this job', 'create application']) => {
        // Look for buttons that contain our target text
        const btn = Array.from(root.querySelectorAll('button'))
                    .find(el => {
                        const txt = el.textContent.trim().toLowerCase();
                        return targets.some(k => txt.includes(k));
                    });
        
        if (btn) return btn;
        const hosts = root.querySelectorAll('*');
        for (const host of hosts) {
            if (host.shadowRoot) {
                const found = findButtonDeep(host.shadowRoot, targets);
                if (found) return found;
            }
        }
        return null;
    };

    const isServerErrorPresent = () => {
        const errorBanner = document.querySelector('[data-test-component="StencilReactMessageBanner"]');
        return errorBanner && errorBanner.textContent.includes('Something went wrong with the server');
    };

    /* 
    // 1. Load-time Recovery Logic (Requirement: Check if we just reloaded from an error)
    const wasJustReloadedFromError = sessionStorage.getItem('SNIPER_ERR_RELOAD') === 'true';

    if (isServerErrorPresent()) {
        if (wasJustReloadedFromError) {
            // If still error after first reload, wait 30s
            const msg = "Server Error - Cooling Down (30s)";
            console.log('[ShiftSniper] ' + msg);
            window.dispatchEvent(new CustomEvent('SNIPER_STATUS', { detail: msg }));
            window.dispatchEvent(new CustomEvent('SNIPER_ERROR', { detail: msg }));
            isTerminated = true;
            setTimeout(() => window.location.reload(), 30000);
            return;
        } else {
            // First time seeing error on load, refresh instantly once
            console.log('[ShiftSniper] Initial server error on load. Refreshing once...');
            sessionStorage.setItem('SNIPER_ERR_RELOAD', 'true');
            window.location.reload();
            return;
        }
    } else {
        // No error present, clear the reload flag
        sessionStorage.removeItem('SNIPER_ERR_RELOAD');
    }
    */

    let cachedButton = null;

    // 2. Continuous Watcher (Requirement: Instant refresh on error during monitoring)
    setInterval(() => {
        if (isTerminated) return;
        /*
        if (isServerErrorPresent()) {
            console.log('[ShiftSniper] Server error detected during monitoring. Refreshing...');
            sessionStorage.setItem('SNIPER_ERR_RELOAD', 'true');
            window.location.reload();
            return;
        }
        */
        const btn = findButtonDeep();
        if (btn) cachedButton = btn;
    }, 500);

    const fastClick = () => {
        const executeClickBurst = (target) => {
            if (!target || !target.isConnected) return false;
            const inner = target.querySelector('div') || target;
            const types = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
            types.forEach(type => {
                const eventConfig = { bubbles: true, cancelable: true, view: window, isTrusted: true, buttons: 1 };
                const event = type.startsWith('pointer') ? new PointerEvent(type, eventConfig) : new MouseEvent(type, eventConfig);
                target.dispatchEvent(event);
                if (inner !== target) inner.dispatchEvent(event);
            });
            if (typeof target.click === 'function') target.click();
            return true;
        };
        let burstCount = 0;
        const burstTimer = setInterval(() => {
            burstCount++;
            const button = (cachedButton && cachedButton.isConnected) ? cachedButton : findButtonDeep();
            executeClickBurst(button);
            if (burstCount > 10) clearInterval(burstTimer);
        }, 20);
    };

    const poll = async () => {
        if (isTerminated) return;
        if (monitoredList.length === 0) {
            console.log("[ShiftSniper] Poll skipped: Queue is empty");
            return;
        }
        
        const token = findToken();
        if (!token) {
            console.warn("[ShiftSniper] Poll skipped: Auth token not found in storage");
            return;
        }

        const target = monitoredList[pollIndex % monitoredList.length];
        pollIndex++;

        // Reset other polling states to keep UI clean
        monitoredList.forEach(m => m.isPolling = false);
        target.isPolling = true;
        updateUI();

        const isJob = target.id.startsWith('JOB-');
        const url = isJob 
            ? `https://${domain}/application/api/job/${target.id}?locale=${locale}`
            : `https://${domain}/application/api/job/get-schedule-details/${target.id}?locale=${locale}`;

        console.log(`[ShiftSniper] Requesting ID: ${target.id} (${pollIndex % monitoredList.length}/${monitoredList.length})`);

        try {
            const res = await fetch(url, {
                headers: { 
                    'Authorization': token, 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (res.status === 403) {
                console.error("[ShiftSniper] 403 Forbidden - Pausing for 1 minute...");
                if (timer) clearInterval(timer);
                is403Paused = true; // Block SNIPER_HEALTHY during cooldown
                const msg = "Paused (403 Error - 1 min)";
                
                // Force RED immediately on all indicators
                window.dispatchEvent(new CustomEvent('SNIPER_SET_STATUS', { detail: { isError: true, msg } }));
                
                setTimeout(() => {
                    if (!isTerminated) {
                        console.log("[ShiftSniper] 1 minute wait over. Resuming monitoring...");
                        is403Paused = false; // Unblock SNIPER_HEALTHY
                        // Force GREEN before resuming
                        window.dispatchEvent(new CustomEvent('SNIPER_SET_STATUS', { detail: { isError: false, msg: "Monitoring..." } }));
                        updateLoop();
                    }
                }, 60000);
                return;
            }

            if (res.status === 429) {
                console.warn("[ShiftSniper] 429 Rate Limited - slowing down");
                consecutiveErrors++;
                // Stay green unless in 403 pause
                if (!is403Paused) window.dispatchEvent(new CustomEvent('SNIPER_HEALTHY')); 
                if (config.mode === 'auto') {
                    currentInterval = Math.min(5000, currentInterval + 500);
                    updateLoop();
                }
                return;
            }

            if (res.ok) {
                consecutiveErrors = 0;
                // Only signal healthy if we're NOT in a 403 cooldown
                if (!is403Paused) window.dispatchEvent(new CustomEvent('SNIPER_HEALTHY')); 
                const json = await res.json();
                const data = json?.data;
                const status = isJob ? data?.postingStatus : data?.status;
                const available = isJob ? 1 : (data?.laborDemandAvailableCount || 0);

                console.log(`[ShiftSniper] Target ${target.id} status: ${status} (Avail: ${available})`);
                target.status = status;
                updateUI();

                const isTriggered = isJob ? (status === "POSTED") : (status === "ACTIVE" && available > 0);
                if (isTriggered) {
                    console.log(`[ShiftSniper] !!! MATCH FOUND FOR ${target.id} !!!`);
                    fastClick();
                    isTerminated = true; // Stop after success
                    window.dispatchEvent(new CustomEvent('SNIPER_SUCCESS'));
                }
            } else {
                console.error(`[ShiftSniper] Request failed with status ${res.status} for ${target.id}`);
                target.status = "Error";
                if (!is403Paused) window.dispatchEvent(new CustomEvent('SNIPER_HEALTHY')); 
                updateUI();
            }
        } catch (e) {
            console.error(`[ShiftSniper] Exception during poll for ${target.id}:`, e);
            target.status = "Error";
            if (!is403Paused) window.dispatchEvent(new CustomEvent('SNIPER_HEALTHY')); 
            updateUI();
        }
    };

    let timer;
    let clickTimer;
    let currentClickInterval = -1;

    const startClickLoop = () => {
        const intervalSecs = parseInt(config.clickInterval);
        
        // If it's already running with this interval, don't touch it!
        if (intervalSecs === currentClickInterval) return;
        
        // If we are changing or stopping, clear the old one
        if (clickTimer) {
            clearInterval(clickTimer);
            clickTimer = null;
        }
        
        currentClickInterval = intervalSecs;
        
        if (intervalSecs > 0) {
            console.log(`[ShiftSniper] Regular Click loop START: ${intervalSecs}s`);
            
            const performClick = () => {
                if (isTerminated) return;
                
                const btn = findButtonDeep(document, ['select this job']);
                if (btn) {
                    console.log(`[ShiftSniper] Executing Regular Click (${intervalSecs}s)`);
                    let count = 0;
                    const t = setInterval(() => {
                        count++;
                        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
                            btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
                        });
                        if (count >= 5) clearInterval(t);
                    }, 25);
                } else {
                    console.log(`[ShiftSniper] Regular Click skipped: Button not found`);
                }
            };

            // Start the interval
            clickTimer = setInterval(performClick, intervalSecs * 1000);
            
            // Also perform an immediate click if we just started it
            performClick();
        } else {
            console.log(`[ShiftSniper] Regular Click loop STOPPED`);
        }
    };

    const updateLoop = () => {
        if (timer) clearInterval(timer);
        if (isTerminated) return;
        const stepInterval = Math.max(100, currentInterval / monitoredList.length);
        timer = setInterval(poll, stepInterval);
        startClickLoop();
    };

    const rebuildQueue = () => {
        const list = [];
        const current = config.currentSchedule || { jobId: JOB_ID, scheduleId: SCH_ID };
        
        if (current.jobId) {
            list.push({ id: current.jobId, status: "Waiting", isCurrent: true, isPolling: false });
        }
        if (current.scheduleId) {
            list.push({ id: current.scheduleId, status: "Waiting", isCurrent: true, isPolling: false });
        }
        
        if (config.extraSchedules && config.extraSchedules.length > 0) {
            console.log(`[ShiftSniper] Adding ${config.extraSchedules.length} extra schedules to queue.`);
            config.extraSchedules.forEach(s => {
                if (s.jobId && s.jobId !== current.jobId && !list.some(item => item.id === s.jobId)) {
                    list.push({ id: s.jobId, status: "Waiting", isCurrent: false, isPolling: false });
                }
                if (s.scheduleId && s.scheduleId !== current.scheduleId && !list.some(item => item.id === s.scheduleId)) {
                    list.push({ id: s.scheduleId, status: "Waiting", isCurrent: false, isPolling: false });
                }
            });
        } else {
            console.log("[ShiftSniper] No extra schedules found in config.");
        }
        
        monitoredList = list;
        console.log(`[ShiftSniper] Queue rebuilt. Total items: ${monitoredList.length}`);
        updateUI();
        updateLoop();
    };

    window.addEventListener('SNIPER_CONFIG', (e) => {
        if (e.detail.isSniperActive) {
            isTerminated = false;
        }
        const oldClickInterval = config.clickInterval;
        config = { ...config, ...e.detail };
        currentInterval = config.interval || 800;
        if (config.clickInterval !== oldClickInterval) startClickLoop();
        rebuildQueue();
    });

    window.addEventListener('SNIPER_STOP', () => {
        isTerminated = true;
        if (timer) clearInterval(timer);
        if (clickTimer) clearInterval(clickTimer);
    });

    rebuildQueue();

    // Handshake: Signal that engine is fully loaded and ready for config
    window.dispatchEvent(new CustomEvent('SNIPER_READY'));
})();
