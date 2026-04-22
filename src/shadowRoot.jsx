import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { getBrowser } from "./utils/browser";

export const initPopup = async () => {
  if (document.getElementById("react-chrome-extension-popup")) return;

  const popup = document.createElement("div");
  popup.id = "react-chrome-extension-popup";
  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.right = "20px";
  popup.style.width = "280px";
  popup.style.height = "auto";
  popup.style.minHeight = "150px";
  popup.style.zIndex = "2147483647";
  popup.style.display = "flex";
  popup.style.pointerEvents = "none"; // Allow clicks through to the page unless on a child

  const shadowRoot = popup.attachShadow({ mode: "open" });
  const reactContainer = document.createElement("div");
  reactContainer.id = "react-target";
  reactContainer.style.pointerEvents = "auto"; // Re-enable pointer events for the UI
  shadowRoot.appendChild(reactContainer);

  const linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.href = getBrowser().runtime.getURL("shadow-root.css");
  shadowRoot.appendChild(linkElement);

  document.body.appendChild(popup);

  const root = createRoot(reactContainer);
  root.render(<App />);

  return { popup, shadowRoot, root };
};