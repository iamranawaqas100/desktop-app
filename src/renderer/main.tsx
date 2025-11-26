import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("🚀 Renderer main.tsx loaded");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ Root element not found!");
} else {
  console.log("✅ Root element found, rendering React app...");

  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("✅ React app rendered successfully");
  } catch (error) {
    console.error("❌ Error rendering React app:", error);
  }
}
