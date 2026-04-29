// Background service worker for Amazon Shift Sniper

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Shift Sniper Extension Installed - Defaulting to ACTIVE');
  chrome.storage.local.set({ isEnabled: true, status: 'Idle' });
});

// Listener for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ pong: true });
  }

  if (message.type === 'UPDATE_BADGE') {
    const tabId = sender.tab ? sender.tab.id : undefined;
    chrome.action.setBadgeText({ text: message.text || "", tabId });
    if (message.color) {
      chrome.action.setBadgeBackgroundColor({ color: message.color, tabId });
    }
  }
  
  if (message.type === 'POLL_SCHEDULE') {
    const tabId = sender.tab.id;
    const apiUrl = message.url;

    // Execute the fetch in the MAIN world to discover the token and bypass isolation
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      args: [apiUrl],
      func: async (url) => {
        const findToken = () => {
          try {
            // 1. Explicitly check common keys
            const containers = ['accessToken', 'idToken', 'sessionToken', 'okta-token-storage', 'oidc.user', 'auth_storage', 'HVH_ACCESS_TOKEN'];
            for (const c of containers) {
              const fromLocal = localStorage.getItem(c);
              const fromSession = sessionStorage.getItem(c);
              const val = fromLocal || fromSession;
              if (val && val.includes('AQIC')) return val;
            }

            // 2. Bruteforce Storage Scan
            const storages = [sessionStorage, localStorage];
            for (let storage of storages) {
              for (let i = 0; i < storage.length; i++) {
                const k = storage.key(i);
                try {
                  const v = storage.getItem(k);
                  if (v && v.length > 300 && v.includes('AQIC')) return v;
                } catch(e) {}
              }
            }

            // 3. Cookie Scan
            const cookies = document.cookie.split(';');
            for (let c of cookies) {
              const val = c.trim().split('=')[1];
              if (val && val.length > 300 && val.includes('AQIC')) return val;
            }
          } catch (err) {
            console.error("Token discovery error:", err);
          }
          return null;
        };

        const authToken = findToken();
        if (!authToken) {
          return { error: "AUTH_TOKEN_NOT_FOUND" };
        }

        const headers = {
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': authToken
        };

        try {
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error("Status " + response.status);
          return await response.json();
        } catch (err) {
          return { error: err.message };
        }
      }
    }).then((injectionResults) => {
      const result = injectionResults[0].result;
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message });
    });

    return true; // Keep channel open for async response
  }
});

// Periodic alarm to keep the service worker alive
// during active monitoring
const keepAlive = () => {
    chrome.storage.local.get(['isEnabled'], (data) => {
        if (data.isEnabled) {
            // Service worker will stay alive while this is running
            console.log('Monitoring active...');
        }
    });
};

setInterval(keepAlive, 20000);