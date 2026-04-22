import { initPopup } from "./shadowRoot.jsx";
import { getFromStorage, saveToStorage } from "./controllers/storageController";

const log = (msg) => console.log(`[Shift Sniper] ${msg}`);

const stopSniperEngine = () => {
    window.dispatchEvent(new CustomEvent('SNIPER_STOP'));
    updateStatus("Idle");
};

const injectSniperEngine = () => {
    const existing = document.getElementById('amazon-sniper-engine');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'amazon-sniper-engine';
    script.src = chrome.runtime.getURL('engine.js');
    (document.head || document.documentElement).appendChild(script);
};

const extractID = (url, key) => {
    try {
        const regex = new RegExp(`[?&]${key}=([^&#]*)`);
        const results = regex.exec(url);
        let id = results ? decodeURIComponent(results[1]) : null;
        if (id && id.includes('~')) id = id.split('~')[0];
        return id;
    } catch(e) { return null; }
};

const parseMultiSchedules = (text) => {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const schedules = [];
    lines.forEach(line => {
        const schId = extractID(line, 'scheduleId');
        const jobId = extractID(line, 'jobId');
        if (schId && !schedules.find(s => s.scheduleId === schId)) {
            schedules.push({ scheduleId: schId, jobId: jobId || 'N/A' });
        }
    });
    return schedules;
};

const startSniper = async () => {
    const currentParams = {
        jobId: extractID(window.location.href, 'jobId'),
        scheduleId: extractID(window.location.href, 'scheduleId')
    };

    if (!currentParams.scheduleId) {
        updateStatus("Error: No Schedule ID");
        return;
    }

    injectSniperEngine();
    updateStatus("Monitoring...");

    // Sync initial config & extra schedules
    const data = await getFromStorage(["interval", "mode", "extraLinks"]);
    const extraSchedules = parseMultiSchedules(data.extraLinks);
    
    // Build initial monitored list
    const monitoredIDs = [
        { id: currentParams.scheduleId, status: "Waiting", isCurrent: true },
        ...extraSchedules.map(s => ({ id: s.scheduleId, status: "Waiting", isCurrent: false }))
    ];
    saveToStorage({ monitoredIDs });

    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('SNIPER_CONFIG', { 
            detail: { 
                interval: data.interval || 800, 
                mode: data.mode || 'auto',
                currentSchedule: currentParams,
                extraSchedules: extraSchedules
            } 
        }));
    }, 600);
};

const updateStatus = (status) => saveToStorage({ status });

const init = async () => {
    const data = await getFromStorage(["isEnabled"]);
    const isEnabled = data.isEnabled !== false; 

    if (isEnabled) startSniper();

    // Event Handlers
    window.addEventListener('SNIPER_STATUS_MULTI', (e) => {
        saveToStorage({ monitoredIDs: e.detail });
    });

    window.addEventListener('SNIPER_SUCCESS', () => {
        updateStatus("Success!");
        saveToStorage({ isEnabled: false });
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "TOGGLE_SNIPER") {
            message.isEnabled ? startSniper() : stopSniperEngine();
        }
        if (message.type === "UPDATE_CONFIG") {
            const config = { ...message.config };
            if (config.extraLinks !== undefined) {
                config.extraSchedules = parseMultiSchedules(config.extraLinks);
            }
            window.dispatchEvent(new CustomEvent('SNIPER_CONFIG', { detail: config }));
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