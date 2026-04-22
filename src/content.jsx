import { initPopup } from "./shadowRoot.jsx";
import { getFromStorage, saveToStorage } from "./controllers/storageController";

let isJobSelected = false;

const log = (msg) => console.log(`[Shift Sniper] ${msg}`);

const stopSniperEngine = () => {
    window.dispatchEvent(new CustomEvent('SNIPER_STOP'));
    updateStatus("Idle");
};

const injectSniperEngine = () => {
    // Clean up any existing instances first
    const existing = document.getElementById('amazon-sniper-engine');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'amazon-sniper-engine';
    script.src = chrome.runtime.getURL('engine.js');
    (document.head || document.documentElement).appendChild(script);
    log("High-speed engine injected via secure link.");
};

const getParamsFromURL = () => {
    const getParam = (name) => {
        const regex = new RegExp('[?&]' + name + '=([^&#]*)');
        const results = regex.exec(window.location.href);
        return results ? decodeURIComponent(results[1]) : null;
    };

    let scheduleId = getParam('scheduleId');
    if (scheduleId && scheduleId.includes('~')) {
        scheduleId = scheduleId.split('~')[0];
    }

    return {
        jobId: getParam('jobId'),
        scheduleId: scheduleId,
        locale: getParam('locale') || 'en-US',
        domain: window.location.hostname
    };
};

const updateStatus = (status) => {
    saveToStorage({ status });
};

const addLog = async (logObj) => {
    const data = await getFromStorage(["logs"]);
    const logs = data.logs || [];
    const newLogs = [logObj, ...logs].slice(0, 20); // Keep last 20 logs
    saveToStorage({ logs: newLogs });
};

const startSniper = async () => {
    const params = getParamsFromURL();
    if (!params.scheduleId) {
        updateStatus("Error: No Schedule ID");
        return;
    }

    injectSniperEngine();
    updateStatus("Monitoring...");

    // Sync initial config
    const config = await getFromStorage(["interval", "mode"]);
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('SNIPER_CONFIG', { 
            detail: { interval: config.interval || 800, mode: config.mode || 'auto' } 
        }));
    }, 500);
};

const init = async () => {
    // Set default logs if empty
    const logData = await getFromStorage(["logs"]);
    if (!logData.logs) saveToStorage({ logs: [] });

    const data = await getFromStorage(["isEnabled"]);
    const isEnabled = data.isEnabled !== false; 

    if (isEnabled) startSniper();

    // Events from the Injected Engine
    window.addEventListener('SNIPER_STATUS', (e) => updateStatus(e.detail));
    window.addEventListener('SNIPER_LOG', (e) => addLog(e.detail));
    window.addEventListener('SNIPER_SUCCESS', () => {
        updateStatus("Success!");
        saveToStorage({ isEnabled: false });
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "TOGGLE_SNIPER") {
            message.isEnabled ? startSniper() : stopSniperEngine();
        }
        if (message.type === "UPDATE_CONFIG") {
            window.dispatchEvent(new CustomEvent('SNIPER_CONFIG', { detail: message.config }));
        }
    });

    // Network Interceptor injection
    const interceptor = document.createElement('script');
    interceptor.id = 'amazon-interceptor';
    if (!document.getElementById('amazon-interceptor')) {
        interceptor.src = chrome.runtime.getURL('interceptor.js');
        (document.head || document.documentElement).appendChild(interceptor);
    }
};

init();