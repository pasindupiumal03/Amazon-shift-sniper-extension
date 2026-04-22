# 🎯 Amazon Shift Sniper PRO v1.2

**The ultimate high-performance automation suite for Amazon Hiring Portal.**  
Designed to secure the most competitive warehouse shifts with sub-100ms reaction times, multi-target monitoring, and advanced anti-ban protection.

---

## ⚡ Key Features

### 🔍 Multi-Schedule Parallel Monitoring
Monitor several job shifts at once without opening multiple tabs. Paste your additional schedule links into the PRO interface, and the engine handles the background polling autonomously.

### 🛡️ Adaptive Rate-Limit Protection
Equipped with an **Exponential Backoff Engine**. If Amazon detects high-frequency traffic, the sniper automatically slows down (429/403 detection) and gradually recovers speed once the connection is stable, keeping your account stealthy and safe.

### 🏎️ Sequential Rotation System
Instead of spamming requests, the engine rotates through your monitored targets sequentially. This distributes the requests across your chosen interval, ensuring a high check frequency without bloating the network footprint.

### 🚀 High-Speed Main-World Injection
By injecting the core engine directly into the webpage's **Main World**, we bypass Chrome's Isolated World latency. This allows the sniper to interact with React buttons and API headers with zero lag.

### 🎯 Precision Auto-Click
Specifically tuned to target the "Select this job" button container. Once availability is detected, it executes a high-speed event sequence (`mousedown` → `mouseup` → `click`) to beat manual clickers every time.

---

## 🛠️ How to Use

1.  **Clone/Download** the repository.
2.  **Build the Project**:
    ```bash
    npm install
    npm run build:dev
    ```
3.  **Load in Chrome**:
    - Go to `chrome://extensions/`
    - Enable **Developer Mode**.
    - Click **Load Unpacked** and select the `/dist` folder.
4.  **Start Sniping**:
    - Navigate to an Amazon Job Opportunity page.
    - Open the Extension Popup.
    - (Optional) Paste additional schedule links for multi-monitoring.
    - Click **START** and let the engine hunt for your shift.

---

## ⚙️ Advanced Configuration

-   **Polling Interval (100ms - 2000ms)**: Fine-tune how fast the engine checks for availability.
-   **Adaptive Mode Toggle**: Enable for maximum safety; disable for aggressive speed in low-traffic environments.
-   **One-Click Reset**: Instantly restore default safe settings and clear all additional monitor targets.

---

## 🏗️ Technical Architecture

-   **Frontend**: React + TailwindCSS (Modern, sleek dark UI).
-   **Build System**: Webpack (Optimized for Manifest V3).
-   **Communication**: CustomEvent Bridge for near-instant communication between the Injected Engine and the Content Script.
-   **Auth Discovery**: Dynamic token discovery across `localStorage`, `sessionStorage`, and `Cookies` to ensure valid API headers at all times.

---

## ⚠️ Safety Warning
This tool is for educational purposes. Use responsible polling intervals (recommended: 400ms+) to ensure the safety of your Amazon Hiring account.

**Amazon Shift Sniper PRO** – *Secure your shift before the first click.*