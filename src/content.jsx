import { getFromStorage, saveToStorage } from "./controllers/storageController";

let isJobSelected = false;
let statusDot = null;
let currentActiveID = null;
let isSniperActive = false;

const log = (msg) => console.log(`[ShiftSniper] ${msg}`);

const createStatusDot = () => {
    if (statusDot) return;
    statusDot = document.createElement('div');
    statusDot.id = 'sniper-status-dot';
    Object.assign(statusDot.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: '#10b981', 
        zIndex: '999999',
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
        transition: 'all 0.3s ease',
        pointerEvents: 'none'
    });
    document.body.appendChild(statusDot);
};

const updateUIStatus = (isError) => {
    if (!statusDot) createStatusDot();
    statusDot.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    statusDot.style.boxShadow = isError ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 0 10px rgba(16, 185, 129, 0.5)';
    
    chrome.runtime.sendMessage({ 
        type: "UPDATE_BADGE", 
        color: isError ? '#ef4444' : '#10b981',
        text: isError ? "ERR" : "ON"
    });
};

const parseMultiSchedules = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const results = [];
    const extractID = (line, key) => {
        // Robust regex to find the ID even if it's at the start of the string
        const regex = new RegExp(`(?:^|[?&])${key}=([^&#]*)`);
        const match = line.match(regex);
        let id = match ? decodeURIComponent(match[1]) : null;
        if (id && id.includes('~')) id = id.split('~')[0];
        return id;
    };
    lines.forEach(line => {
        const sId = extractID(line, 'scheduleId');
        const jId = extractID(line, 'jobId');
        if (sId) results.push({ scheduleId: sId, jobId: jId });
    });
    return results;
};

const injectSniperEngine = () => {
    if (document.getElementById('sniper-engine')) return;
    const script = document.createElement('script');
    script.id = 'sniper-engine';
    script.src = chrome.runtime.getURL('engine.js');
    (document.head || document.documentElement).appendChild(script);
};

const startSniper = () => {
    injectSniperEngine();
    createStatusDot();
    updateUIStatus(false);
    updateStatus("Monitoring...");
};

const stopSniperEngine = () => {
    window.dispatchEvent(new CustomEvent('SNIPER_STOP'));
    if (statusDot) {
        statusDot.remove();
        statusDot = null;
    }
    chrome.runtime.sendMessage({ type: "UPDATE_BADGE", text: "" });
    updateStatus("Stopped");
};

const updateStatus = (status) => saveToStorage({ status });

const getParam = (name) => {
    const url = new URL(window.location.href);
    // 1. Check main search params
    let val = url.searchParams.get(name);
    
    // 2. Check hash fragment (common for #/consent or #/job-opportunities)
    if (!val && url.hash.includes('?')) {
        const hashQuery = url.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        val = hashParams.get(name);
    }

    if (val && val.includes('~')) val = val.split('~')[0];
    return val;
};

const runScanner = async () => {

    const data = await getFromStorage(["isEnabled", "interval", "mode", "extraLinks", "clickInterval"]);
    isSniperActive = data.isEnabled !== false; 

    const currentParams = { jobId: getParam('jobId'), scheduleId: getParam('scheduleId') };
    if (!currentParams.scheduleId) {
        log("No active schedule found in URL.");
        return;
    }

    // Update global state tracking
    currentActiveID = currentParams.scheduleId;

    if (isSniperActive) {
        startSniper();
        const extraSchedules = parseMultiSchedules(data.extraLinks);
        const monitoredIDs = [
            { id: currentParams.scheduleId, status: "Waiting", isCurrent: true },
            ...extraSchedules.map(s => ({ id: s.scheduleId, status: "Waiting", isCurrent: false }))
        ];
        saveToStorage({ monitoredIDs });

        // Wait for engine to signal ready
        const sendConfig = () => {
            log("Sending configuration to engine...");
            window.dispatchEvent(new CustomEvent('SNIPER_CONFIG', { 
                detail: { 
                    interval: data.interval || 800, 
                    mode: data.mode || 'auto',
                    clickInterval: data.clickInterval || 0,
                    currentSchedule: currentParams,
                    extraSchedules: extraSchedules,
                    isSniperActive: isSniperActive
                } 
            }));
            window.removeEventListener('SNIPER_READY', sendConfig);
        };
        window.addEventListener('SNIPER_READY', sendConfig);
        
        // Manual trigger if engine was already loaded
        if (document.getElementById('sniper-engine')) sendConfig();
    }
};

const init = () => {
    runScanner();

    // Watch for internal hash navigation (Requirement: Support for #/consent transitions)
    window.addEventListener('hashchange', () => {
        log("Hash change detected, re-scanning parameters...");
        const newID = getParam('scheduleId');
        if (newID && newID !== currentActiveID) {
            runScanner();
        }
    });

    window.addEventListener('SNIPER_SUCCESS', () => {
        isJobSelected = true;
        updateStatus("Success!");
        updateUIStatus(false);
        saveToStorage({ isEnabled: false });
    });

    window.addEventListener('SNIPER_ERROR', (e) => {
        updateUIStatus(true);
        updateStatus(e.detail);
    });

    chrome.runtime.onMessage.addListener(async (message) => {
        if (message.type === "TOGGLE_SNIPER") {
            isSniperActive = message.isEnabled; 
            message.isEnabled ? startSniper() : stopSniperEngine();
            if (message.isEnabled) runScanner();
        }
        if (message.type === "UPDATE_CONFIG") {
            // Re-fetch isEnabled from storage if we are unsure of state
            if (!isSniperActive) {
                const res = await getFromStorage(["isEnabled"]);
                isSniperActive = res.isEnabled !== false;
            }
            
            const config = { ...message.config, isSniperActive };
            if (config.extraLinks !== undefined) {
                config.extraSchedules = parseMultiSchedules(config.extraLinks);
                log(`Parsed ${config.extraSchedules.length} extra schedules from bulk paste.`);
            }
            
            log("Sending configuration to engine:", config);
            window.dispatchEvent(new CustomEvent('SNIPER_CONFIG', { detail: config }));
        }
    });

    // Sync state across all tabs when storage changes
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.isEnabled) {
            isSniperActive = changes.isEnabled.newValue;
            isSniperActive ? startSniper() : stopSniperEngine();
            if (isSniperActive) runScanner();
        }
    });

    const interceptor = document.createElement('script');
    interceptor.id = 'amazon-interceptor';
    if (!document.getElementById('amazon-interceptor')) {
        interceptor.src = chrome.runtime.getURL('interceptor.js');
        (document.head || document.documentElement).appendChild(interceptor);
    }

};

init();