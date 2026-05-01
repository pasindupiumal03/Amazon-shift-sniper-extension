import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getFromStorage, saveToStorage } from "./controllers/storageController";
import "./index.css";

const Popup = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [isError, setIsError] = useState(false);
    const [status, setStatus] = useState("Idle");
    const [interval, setIntervalVal] = useState(800);
    const [clickInterval, setClickInterval] = useState(0);
    const [mode, setMode] = useState("auto");
    const [extraLinks, setExtraLinks] = useState("");
    const [monitoredIDs, setMonitoredIDs] = useState([]);
    const [linkInput, setLinkInput] = useState("");

    const extractScheduleId = (url) => {
        const regex = /[?&]scheduleId=([^&#]*)/;
        const match = url.match(regex);
        return match ? decodeURIComponent(match[1]).split('~')[0] : null;
    };

    const handleAddLink = () => {
        if (!linkInput.trim()) return;
        
        // Support bulk pasting by splitting on any whitespace or newlines
        const potentialParts = linkInput.split(/[\s\n]+/).filter(p => p.trim());
        const validLinks = potentialParts.filter(p => p.includes('scheduleId=') || p.startsWith('http'));
        
        if (validLinks.length > 0) {
            const currentLinksArr = extraLinks ? extraLinks.split('\n').filter(l => l.trim()) : [];
            // Filter out duplicates
            const uniqueNewLinks = validLinks.filter(l => !currentLinksArr.includes(l));
            const updatedLinks = [...currentLinksArr, ...uniqueNewLinks];
            handleLinksChange(updatedLinks.join('\n'));
        }
        
        setLinkInput("");
    };

    const handleClearAll = () => {
        handleLinksChange("");
    };

    const handleRemoveLink = (index) => {
        const links = extraLinks.split('\n').filter(l => l.trim());
        links.splice(index, 1);
        handleLinksChange(links.join('\n'));
    };

    useEffect(() => {
        getFromStorage(["isEnabled", "isError", "status", "interval", "mode", "extraLinks", "monitoredIDs", "clickInterval"]).then((data) => {
            if (data.isEnabled !== undefined) setIsEnabled(data.isEnabled);
            if (data.isError !== undefined) setIsError(data.isError);
            if (data.status) setStatus(data.status);
            if (data.interval) setIntervalVal(data.interval);
            if (data.mode) setMode(data.mode);
            if (data.extraLinks) setExtraLinks(data.extraLinks);
            if (data.monitoredIDs) setMonitoredIDs(data.monitoredIDs);
            if (data.clickInterval) setClickInterval(data.clickInterval);
        });

        const listener = (changes) => {
            if (changes.status) setStatus(changes.status.newValue);
            if (changes.isEnabled) setIsEnabled(changes.isEnabled.newValue);
            if (changes.isError !== undefined) setIsError(changes.isError.newValue);
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
            clickInterval: 0,
            mode: "auto",
            extraLinks: "",
            monitoredIDs: []
        };
        setIntervalVal(defaults.interval);
        setClickInterval(defaults.clickInterval);
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

    const handleClickIntervalChange = (val) => {
        const v = parseInt(val);
        setClickInterval(v);
        saveToStorage({ clickInterval: v });
        syncConfig({ clickInterval: v });
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
                        <img src="./assets/icons/32.png" className="w-5 h-5" alt="logo" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">Shift Sniper</h1>
                </div>
                <div className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-1 rounded-full uppercase tracking-widest">PRO</div>
            </div>

            {/* Status Section */}
            <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Current Engine Status</span>
                    <span className="text-xs">{isEnabled ? (isError ? "🔴" : "🟢") : "🔴"}</span>
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
                <div className="flex items-center justify-between pl-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Additional Schedule Links</label>
                    {extraLinks && extraLinks.trim() && (
                        <button onClick={handleClearAll} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter transition-all">Clear All</button>
                    )}
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        className="flex-grow bg-black/40 border border-gray-800 rounded-xl px-3 py-2 text-[11px] text-gray-300 focus:outline-none focus:border-orange-500/50"
                        placeholder="Paste link(s) and hit Enter..."
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                    />
                    <button 
                        onClick={handleAddLink}
                        className="bg-orange-500 hover:bg-orange-600 p-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Links List */}
                <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1.5 pt-1 pr-0.5">
                    {extraLinks.split('\n').filter(l => l.trim()).map((link, idx) => {
                        const sid = extractScheduleId(link);
                        return (
                            <div key={idx} className="flex items-center justify-between bg-gray-800/40 border border-gray-700/30 rounded-lg px-2 py-1.5 group hover:border-gray-600/50 transition-all">
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[8px] text-gray-600 uppercase font-bold leading-none mb-0.5">SID-{idx+1}</span>
                                    <span className="text-[10px] text-orange-300 font-mono font-medium truncate">{sid || "Extracted ID"}</span>
                                </div>
                                <button 
                                    onClick={() => handleRemoveLink(idx)}
                                    className="text-gray-600 hover:text-red-400 p-1 rounded-md hover:bg-red-400/10 transition-all md:opacity-0 group-hover:opacity-100 flex-shrink-0"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                    {(!extraLinks || !extraLinks.trim()) && (
                        <div className="text-center py-4 border-2 border-dashed border-gray-800/50 rounded-xl bg-gray-800/10">
                            <div className="text-[10px] text-gray-600 font-medium italic">Ready for bulk paste...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Config Panel */}
            <div className="space-y-3 bg-gray-800/30 p-3 rounded-xl border border-gray-700/30">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-400 font-bold tracking-wide uppercase">Polling Interval: <span className="text-orange-300 font-mono">{interval}ms</span></label>
                </div>
                <input 
                    type="range" min="100" max="2000" step="50"
                    value={interval}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-gray-400 font-bold tracking-wide uppercase">Regular Click: <span className="text-orange-300 font-mono">{clickInterval === 0 ? "OFF" : clickInterval + "s"}</span></label>
                </div>
                <input 
                    type="range" min="0" max="60" step="5"
                    value={clickInterval}
                    onChange={(e) => handleClickIntervalChange(e.target.value)}
                    className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1 border-t border-gray-800 mt-2">
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