# Amazon Shift Sniper PRO

An advanced, enterprise-grade automation suite engineered specifically for the Amazon Hiring Portal. Designed to provide candidates with a decisive advantage in securing high-demand shifts through ultra-low latency monitoring and high-frequency interaction.

![Version](https://img.shields.io/badge/Version-1.2-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Chrome_Extension-blue?style=for-the-badge)
![Performance](https://img.shields.io/badge/Performance-Ultra--Low_Latency-green?style=for-the-badge)

---

## 🚀 Core Features

### ⚡ "Fast-Click" Interaction Engine
*   **Shadow DOM Penetration**: Advanced recursive logic to bypass Amazon's Stencil.js/Shadow DOM encapsulation, targeting buttons that standard extensions can't see.
*   **Event Flooding (Burst Mode)**: Executes a high-speed sequence of `pointerdown`, `mousedown`, `pointerup`, and `click` events (10 clicks per burst) to ensure sub-millisecond registration.
*   **Pre-Cache Optimization**: Automatically scans and caches button references every 500ms, ensuring zero-latency response when a shift becomes available.

### 🔄 Dynamic Multi-Monitor System
*   **Bulk Link Management**: Seamlessly monitor dozens of shifts simultaneously. Supports **Bulk Paste**—simply paste a block of text containing multiple URLs, and the engine will extract them automatically.
*   **Intelligent Schedule ID Extraction**: Automatically parses and displays specific **Schedule IDs** for every link, making it easy to track exactly what you are monitoring.
*   **Rotating Polling Queue**: Cyclically rotates through the current page and all additional links to maximize coverage without triggering security flags.
*   **Quick Management**: Interactive list with "Hover-to-Delete" and "Clear All" functionality for rapid configuration.

### 🛡️ Safety & Rate-Limit Protection
*   **Adaptive Polling (Auto-Mode)**: Dynamically adjusts polling frequency (200ms - 5000ms) based on server health and rate-limit (429) signals.
*   **Anti-Detection Handshake**: Operates within the page's "Main World" to inherit active session tokens and CSRF headers, making requests indistinguishable from legitimate user behavior.
*   **Automatic 403 Recovery**: Detects session expiration or Forbidden (403) errors and pauses for 60 seconds to allow the session to stabilize.

### 🎨 Premium Interface (PRO UI)
*   **Glassmorphism Design**: A sleek, dark-mode interface built with React and Tailwind CSS.
*   **Zero-Distraction UI**: All scrollbars are hidden (but fully functional) to maintain a clean, professional look.
*   **Real-Time Status Feed**: Provides a live breakdown of every monitored schedule, including individual status (Active, Waiting, Error) and polling activity.

---

## 📦 Installation Guide

1.  **Download**: Extract the provided extension package to your computer.
2.  **Developer Mode**: Open Chrome and navigate to `chrome://extensions/`.
3.  **Load Unpacked**: Enable **Developer mode** (top-right) and click **Load unpacked**.
4.  **Select Folder**: Select the `dist` folder from the extracted files.
5.  **Pin**: Pin the **Shift Sniper** icon to your toolbar for instant access.

---

## 📖 Advanced Usage

### 📋 Managing Multiple Schedules
Instead of monitoring one job at a time, you can now paste a list of multiple job URLs into the **Additional Schedule Links** section. The extension will:
1.  Parse each link for its `scheduleId`.
2.  Show each ID in a scrollable list.
3.  Automatically start polling them in the background while you stay on your main page.

### ⏱️ Regular Click Feature (Burst Mode)
For users who want even more aggression, the **Regular Click** feature allows you to set a fixed interval (from 5s to 60s). Even if a shift hasn't been detected via the API yet, the engine will perform a "blind" burst click on the "Select this job" button to ensure you are first in line.

### 🔍 Diagnostic Logs
For power users, the extension provides detailed logs in the **Browser Console (F12)**. You can track:
*   Every successful API request.
*   Exactly when a button was clicked.
*   Status updates for every monitored schedule in your queue.

---

## 🛠️ Technology Stack

*   **UI Framework**: React 18 with Tailwind CSS.
*   **Logic Engine**: Vanilla JavaScript (ES2022) with Main World injection.
*   **Bundling**: Webpack 5 with Production-grade minification.
*   **State Management**: Chrome Storage Sync for persistent settings across browser restarts.

---

## 🛡️ Best Practices for Success

*   **Recommended Interval**: Set Polling to **800ms - 1000ms** for a perfect balance of speed and safety.
*   **Stable Session**: Ensure you are logged into your Amazon account before starting the engine.
*   **One Window Only**: While the extension supports multi-link monitoring, keep it active in only **one tab** at a time to prevent session fragmentation.

---
© 2026 Amazon Shift Sniper Suite. Engineered for High-Performance Availability Monitoring.