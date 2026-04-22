import React, { useState, useEffect } from "react";
import { getFromStorage, saveToStorage } from "./controllers/storageController";

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [params, setParams] = useState({
    jobId: "",
    scheduleId: "",
    applicationId: "",
    locale: "en-US",
    domain: ""
  });

  useEffect(() => {
    // Initial state from storage
    getFromStorage(["isEnabled", "status"]).then((data) => {
      setIsActive(!!data.isEnabled);
      if (data.status) setStatus(data.status);
    });

    // Listen for changes from popup or background
    const messageListener = (message) => {
      if (message.type === "STATE_UPDATED") {
        setIsActive(message.isEnabled);
        setStatus(message.status || "Idle");
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-white text-gray-800 p-4 shadow-lg rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h1 className="text-xl font-bold text-orange-600">Shift Sniper</h1>
        <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <p className={`text-lg font-semibold ${status === 'Success' ? 'text-green-600' : 'text-blue-600'}`}>
            {status}
          </p>
        </div>

        {isActive && (
          <div className="p-3 bg-orange-50 rounded-md border border-orange-100">
            <p className="text-xs text-orange-700 font-medium mb-1">MONITORING ACTIVE</p>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Schedule ID:</span>
                <span className="font-mono">{params.scheduleId || 'Detecting...'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 text-[10px] text-gray-400 text-center">
        Amazon Shift Sniper v1.0
      </div>
    </div>
  );
}