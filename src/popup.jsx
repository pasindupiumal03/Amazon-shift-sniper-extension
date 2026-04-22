import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getFromStorage, saveToStorage } from "./controllers/storageController";
import "./index.css";

const Popup = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [status, setStatus] = useState("Idle");
    const [interval, setIntervalVal] = useState(800);
    const [mode, setMode] = useState("auto"); // auto or manual
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        // Load initial state
        getFromStorage(["isEnabled", "status", "interval", "mode", "logs"]).then((data) => {
            if (data.isEnabled !== undefined) setIsEnabled(data.isEnabled);
            if (data.status) setStatus(data.status);
            if (data.interval) setIntervalVal(data.interval);
            if (data.mode) setMode(data.mode);
            if (data.logs) setLogs(data.logs);
        });

        // Listen for status/log updates
        const listener = (changes) => {
            if (changes.status) setStatus(changes.status.newValue);
            if (changes.logs) setLogs(changes.logs.newValue);
            if (changes.isEnabled) setIsEnabled(changes.isEnabled.newValue);
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const toggleSniper = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        saveToStorage({ isEnabled: newState });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_SNIPER", isEnabled: newState });
            }
        });
    };

    const handleIntervalChange = (val) => {
        const v = Math.max(100, Math.min(2000, parseInt(val) || 100));
        setIntervalVal(v);
        saveToStorage({ interval: v });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_CONFIG", config: { interval: v } });
            }
        });
    };

    const toggleMode = () => {
        const newMode = mode === "auto" ? "manual" : "auto";
        setMode(newMode);
        saveToStorage({ mode: newMode });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_CONFIG", config: { mode: newMode } });
            }
        });
    };

    const getStatusIcon = () => {
        if (!isEnabled) return "🔴";
        if (status.includes("Waiting") || status === "Monitoring...") return "🟢";
        if (status.includes("Error") || status.includes("Limit")) return "🟡";
        return "⚪";
    };

    return (
        <div className="w-80 p-4 bg-gray-900 text-white font-poppins rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500 rounded-lg shadow-inner">
                        <img src="./assets/icons/32.png" className="w-5 h-5 invert" alt="logo" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">Shift Sniper</h1>
                </div>
                <div className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-1 rounded-full uppercase tracking-widest">v1.2</div>
            </div>

            {/* Status Section */}
            <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Current Engine Status</span>
                    <span className="text-xs">{getStatusIcon()}</span>
                </div>
                <div className="text-sm font-semibold truncate text-orange-400">{status}</div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 gap-3 mb-4">
                <button 
                    onClick={toggleSniper}
                    className={`w-full py-2.5 rounded-xl font-bold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                        isEnabled ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-green-500 hover:bg-green-600 shadow-green-500/20"
                    }`}
                >
                    {isEnabled ? "STOP MONITORING" : "START MONITORING"}
                </button>
            </div>

            {/* Config Panel */}
            <div className="space-y-3 bg-gray-800/30 p-3 rounded-xl border border-gray-700/30 mb-4">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-400 font-bold tracking-wide">POLLING INTERVAL</label>
                    <span className="text-xs font-mono text-orange-300">{interval}ms</span>
                </div>
                <input 
                    type="range" min="100" max="2000" step="50"
                    value={interval}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-gray-400 font-bold tracking-wide uppercase">Adaptive Backoff</label>
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