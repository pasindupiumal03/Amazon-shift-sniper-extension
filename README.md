# Amazon Shift Sniper Extension

A high-performance, resilient browser extension designed for high-frequency monitoring and automated shift booking on the Amazon Hiring Portal.

## Recent Core Enhancements & Fixes

### 1. High-Reliability Configuration Bridge
Overhauled the communication between the extension and the monitoring engine to eliminate race conditions during page refreshes.
- **Direct DOM Embedding**: Configurations are now injected directly into the script tag's data attributes.
- **Instant Boot**: The engine reads settings (Intervals, Extra Links, Toggle State) synchronously on load.
- **Refresh Persistence**: Monitoring targets and automation settings now persist 100% reliably across tab refreshes.

### 2. Intelligent 403 Error Handling & Cooldown
Implemented a robust protection mechanism to handle session expiration and security blocks.
- **Auto-Pause**: If a `403 Forbidden` error is detected, the extension pauses all API requests for exactly **60 seconds**.
- **Auto-Resume**: Monitoring automatically restarts after the 1-minute cooldown without requiring manual intervention.
- **State Guard**: Integrated a block-flag (`is403Paused`) to prevent in-flight successful requests from prematurely clearing the error state.

### 3. Precision Status Indicators
Refined the visual feedback system to provide clear, accurate status signals.
- **Atomic Indicators**: The webpage status dot, the extension badge ("ON"/"ERR"), and the popup indicator are now perfectly synchronized.
- **Visual Logic**:
    - 🔴 **Red**: Displayed ONLY during a 403 Error/Cooldown period.
    - 🟢 **Green**: Displayed during active monitoring, even if temporary rate limits (429) or network glitches occur.
- **Live Sync**: Popup UI now listens to real-time storage changes to reflect the engine's health state instantly.

### 4. Bulk Link Management
Optimized the "Additional Links" feature for efficiency.
- **Multi-Parsing**: Supports bulk pasting of URLs or raw IDs. The engine automatically extracts `jobId` and `scheduleId`.
- **Duplicate Prevention**: Filters out existing links to maintain a clean monitoring queue.
- **UI Persistence**: Added a scrollable sidebar with hidden professional scrollbars for managing large monitoring lists.

### 5. Automation Resilience
- **Persistent Regular Click**: The "Regular Click" feature now resumes automatically after page reloads.
- **Token Discovery**: Enhanced the background interceptor's ability to discover and inherit valid session tokens from the main page world.
- **No Expiration**: Removed legacy date-based expiration checks for unlimited usage.

## Technical Stack
- **Frontend**: React (Popup), Vanilla JS (Engine, Interceptor).
- **Styling**: Vanilla CSS with custom animations and glassmorphism.
- **World Interaction**: Optimized for both `ISOLATED` and `MAIN` script worlds to bypass Amazon's security headers and CSRF requirements.

## How to Build
```bash
yarn install
yarn build
```
Load the `dist` folder into your browser as an unpacked extension.