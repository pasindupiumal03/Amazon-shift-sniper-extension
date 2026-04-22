import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getFromStorage, saveToStorage } from "./controllers/storageController";
import "./index.css";

const Popup = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [status, setStatus] = useState("Idle");
    const [interval, setIntervalVal] = useState(800);
    const [mode, setMode] = useState("auto");
    const [extraLinks, setExtraLinks] = useState("");
    const [monitoredIDs, setMonitoredIDs] = useState([]);

    useEffect(() => {
        getFromStorage(["isEnabled", "status", "interval", "mode", "extraLinks", "monitoredIDs"]).then((data) => {
            if (data.isEnabled !== undefined) setIsEnabled(data.isEnabled);
            if (data.status) setStatus(data.status);
            if (data.interval) setIntervalVal(data.interval);
            if (data.mode) setMode(data.mode);
            if (data.extraLinks) setExtraLinks(data.extraLinks);
            if (data.monitoredIDs) setMonitoredIDs(data.monitoredIDs);
        });

        const listener = (changes) => {
            if (changes.status) setStatus(changes.status.newValue);
            if (changes.isEnabled) setIsEnabled(changes.isEnabled.newValue);
            if (changes.monitoredIDs) setMonitoredIDs(changes.monitoredIDs.newValue);
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const toggleSniper = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        saveToStorage({ isEnabled: newState });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_SNIPER", isEnabled: newState });
        });
    };

    const handleReset = () => {
        const defaults = {
            interval: 800,
            mode: "auto",
            extraLinks: "",
            monitoredIDs: []
        };
        setIntervalVal(defaults.interval);
        setMode(defaults.mode);
        setExtraLinks(defaults.extraLinks);
        saveToStorage(defaults);
        syncConfig(defaults);
    };

    const handleIntervalChange = (val) => {
        const v = Math.max(100, Math.min(2000, parseInt(val) || 100));
        setIntervalVal(v);
        saveToStorage({ interval: v });
        syncConfig({ interval: v });
    };

    const handleLinksChange = (val) => {
        setExtraLinks(val);
        saveToStorage({ extraLinks: val });
        syncConfig({ extraLinks: val });
    };

    const toggleMode = () => {
        const newMode = mode === "auto" ? "manual" : "auto";
        setMode(newMode);
        saveToStorage({ mode: newMode });
        syncConfig({ mode: newMode });
    };

    const syncConfig = (obj) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_CONFIG", config: obj });
        });
    };

    const getStatusIcon = (schStatus) => {
        if (schStatus === "ACTIVE") return "🟢";
        if (schStatus === "UNPOSTED" || schStatus === "Waiting" || schStatus === "POSTED") return "🟡";
        if (schStatus === "Error") return "🔴";
        return "⚪";
    };

    return (
        <div className="w-80 p-4 bg-gray-900 text-white font-poppins rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500 rounded-lg shadow-inner">
                        <img src="./assets/icons/32.png" className="w-5 h-5 invert" alt="logo" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">Shift Sniper</h1>
                </div>
                <div className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-1 rounded-full uppercase tracking-widest">PRO</div>
            </div>

            {/* Status Section */}
            <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Current Engine Status</span>
                    <span className="text-xs">{isEnabled ? "🟢" : "🔴"}</span>
                </div>
                <div className="text-sm font-semibold truncate text-orange-400">{status}</div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={toggleSniper}
                    className={`flex-grow py-3 rounded-xl font-bold transition-all duration-200 shadow-lg ${
                        isEnabled ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-green-500 hover:bg-green-600 shadow-green-500/20"
                    }`}
                >
                    {isEnabled ? "STOP" : "START"}
                </button>
                <button 
                    onClick={handleReset}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all text-[10px] uppercase tracking-wider border border-gray-700"
                >
                    Reset
                </button>
            </div>

            {/* Multi-Monitor Section */}
            <div className="space-y-2 mb-4">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pl-1 font-mono">Additional Schedule Links</label>
                <textarea 
                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-2 text-[10px] text-gray-300 focus:outline-none focus:border-orange-500/50 no-scrollbar h-20 placeholder-gray-700" 
                    placeholder="Paste extra links here..."
                    value={extraLinks}
                    onChange={(e) => handleLinksChange(e.target.value)}
                />
            </div>

            {/* Active Monitoring List */}
            <div className="bg-gray-800/20 rounded-xl border border-gray-800 p-2 mb-4 max-h-32 overflow-y-auto no-scrollbar">
                <div className="text-[10px] font-bold text-gray-500 mb-2 border-b border-gray-800 pb-1 flex justify-between px-1">
                    <span>MONITORED IDS</span>
                    <span>STATUS</span>
                </div>
                <div className="space-y-1.5">
                    {monitoredIDs.length > 0 ? monitoredIDs.map((sch, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] px-1 font-mono">
                            <span className={sch.isCurrent ? "text-orange-400 font-bold" : "text-gray-400"}>
                                {sch.id} {sch.isCurrent && " (Cur)"}
                                {sch.isPolling && <span className="text-blue-400 ml-2 animate-pulse text-[8px] uppercase">● Polling</span>}
                            </span>
                            <span>{getStatusIcon(sch.status)}</span>
                        </div>
                    )) : (
                        <div className="text-center py-2 text-[9px] text-gray-600 uppercase font-bold tracking-widest">No Active Targets</div>
                    )}
                </div>
            </div>

            {/* Config Panel */}
            <div className="space-y-3 bg-gray-800/30 p-3 rounded-xl border border-gray-700/30">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-400 font-bold tracking-wide">INTERVAL: <span className="text-orange-300 font-mono">{interval}ms</span></label>
                </div>
                <input 
                    type="range" min="100" max="2000" step="50"
                    value={interval}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-gray-400 font-bold tracking-wide uppercase">Adaptive Protection</label>
                    <button 
                        onClick={toggleMode}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                            mode === "auto" ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-400"
                        }`}
                    >
                        {mode === "auto" ? "ENABLED" : "DISABLED"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const container = document.getElementById("react-target");
const root = createRoot(container);
root.render(<Popup />);

export default Popup;