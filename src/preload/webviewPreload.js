// Webview preload script for content extraction
console.log("Webview preload starting...");

// State management
let isSelecting = false;
let currentField = null;
let highlightedElements = [];
let extractedData = [];
let currentTemplate = {
  image: null,
  title: null,
  description: null,
  price: null,
};
let extractionMode = "manual";

// Helper function to send messages to the host
function sendToHost(channel, data) {
  if (window.electronAPI && window.electronAPI.sendToHost) {
    window.electronAPI.sendToHost(channel, data);
  } else {
    // Fallback for webview IPC
    try {
      const { ipcRenderer } = require("electron");
      ipcRenderer.sendToHost(channel, data);
    } catch (e) {
      console.log("IPC not available, using postMessage");
      window.parent.postMessage({ channel, data }, "*");
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  console.log("Initializing extraction system...");
  injectStyles();
  setupExtractionListeners();
  setupMessageListener();
}

function setupMessageListener() {
  // Listen for messages from the host
  try {
    const { ipcRenderer } = require("electron");

    ipcRenderer.on("start-selection", (event, field) => {
      console.log("Received start-selection:", field);
      startSelection(field);
    });

    ipcRenderer.on("stop-selection", () => {
      stopSelection();
    });

    ipcRenderer.on("find-similar", () => {
      findSimilar();
    });

    ipcRenderer.on("clear-highlights", () => {
      clearHighlights();
    });

    ipcRenderer.on("set-extraction-mode", (event, mode) => {
      setExtractionMode(mode);
    });
  } catch (e) {
    console.log("IPC not available, using message events");

    // Fallback to message events
    window.addEventListener("message", (event) => {
      if (event.data.type === "START_SELECTION") {
        startSelection(event.data.field);
      } else if (event.data.type === "STOP_SELECTION") {
        stopSelection();
      } else if (event.data.type === "FIND_SIMILAR") {
        findSimilar();
      } else if (event.data.type === "CLEAR_HIGHLIGHTS") {
        clearHighlights();
      } else if (event.data.type === "SET_EXTRACTION_MODE") {
        setExtractionMode(event.data.mode);
      }
    });
  }
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Selection highlights */
    .extractor-selected {
      outline: 3px solid #4DEAC7 !important;
      outline-offset: 2px !important;
      background-color: rgba(77, 234, 199, 0.15) !important;
      position: relative !important;
      z-index: 10000 !important;
    }

    .extractor-selected::after {
      content: "✓" !important;
      position: absolute !important;
      top: -12px !important;
      right: -12px !important;
      background: #4DEAC7 !important;
      color: #1e293b !important;
      border-radius: 50% !important;
      width: 20px !important;
      height: 20px !important;
      font-size: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 10001 !important;
      font-weight: bold !important;
      box-shadow: 0 2px 8px rgba(77, 234, 199, 0.3) !important;
    }

    .extractor-hover {
      outline: 2px solid #4DEAC7 !important;
      outline-offset: 2px !important;
      background-color: rgba(77, 234, 199, 0.1) !important;
      cursor: crosshair !important;
    }

    .extractor-similar {
      outline: 3px solid #34d399 !important;
      outline-offset: 2px !important;
      background-color: rgba(52, 211, 153, 0.15) !important;
      position: relative !important;
      z-index: 10000 !important;
    }

    /* Selection mode styles */
    body.extractor-selecting {
      user-select: none !important;
      cursor: crosshair !important;
    }

    /* Selection overlay */
    .extractor-overlay {
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(77, 234, 199, 0.95) !important;
      color: #1e293b !important;
      padding: 12px 24px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      text-align: center !important;
      pointer-events: none !important;
      z-index: 999999 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
  `;
  document.head.appendChild(style);
}

function setupExtractionListeners() {
  // Remove any existing listeners first
  document.removeEventListener("mouseover", handleMouseOver, true);
  document.removeEventListener("mouseout", handleMouseOut, true);
  document.removeEventListener("click", handleClick, true);

  // Add new listeners
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleClick, true);
}

let lastHoveredElement = null;

function handleMouseOver(e) {
  if (!isSelecting) return;

  const element = e.target;

  // Skip if it's the same element
  if (element === lastHoveredElement) return;

  // Remove hover from previous element
  if (lastHoveredElement) {
    lastHoveredElement.classList.remove("extractor-hover");
  }

  // Add hover to new element
  element.classList.add("extractor-hover");
  lastHoveredElement = element;
}

function handleMouseOut(e) {
  if (!isSelecting) return;

  const element = e.target;
  element.classList.remove("extractor-hover");

  if (element === lastHoveredElement) {
    lastHoveredElement = null;
  }
}

function handleClick(e) {
  if (!isSelecting) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const element = e.target;
  console.log("Element clicked:", element);

  extractDataFromElement(element);
  return false;
}

function extractDataFromElement(element) {
  const value = extractValue(element, currentField);
  const selector = generateSelector(element);

  console.log("Extracted:", currentField, value);

  if (extractionMode === "template") {
    // Template mode - save selector for later use
    currentTemplate[currentField] = { element, selector, value };
    sendToHost("element-selected", {
      field: currentField,
      value,
      selector,
      mode: "template",
    });
  } else {
    // Manual mode - extract single item
    const extractedItem = {
      [currentField]: value,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      verified: false,
    };

    extractedData.push(extractedItem);
    sendToHost("data-extracted", extractedItem);
  }

  // Add permanent highlight
  element.classList.remove("extractor-hover");
  element.classList.add("extractor-selected");
  highlightedElements.push(element);

  // Stop selecting after extraction
  stopSelection();
}

function extractValue(element, type) {
  switch (type) {
    case "image": {
      if (element.tagName === "IMG") {
        return (
          element.src ||
          element.getAttribute("data-src") ||
          element.getAttribute("data-lazy") ||
          ""
        );
      }

      const bgImage = window.getComputedStyle(element).backgroundImage;
      if (bgImage && bgImage !== "none") {
        const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) return match[1];
      }

      const childImg = element.querySelector("img");
      if (childImg) {
        return (
          childImg.src ||
          childImg.getAttribute("data-src") ||
          childImg.getAttribute("data-lazy") ||
          ""
        );
      }
      return "";
    }

    case "title":
      return (
        element.title ||
        element.alt ||
        element.textContent?.trim() ||
        element.getAttribute("aria-label") ||
        ""
      );

    case "description":
      return (
        element.textContent?.trim() ||
        element.getAttribute("data-description") ||
        element.getAttribute("aria-description") ||
        ""
      );

    case "price": {
      const priceText = element.textContent?.trim() || "";

      // Price extraction patterns
      const patterns = [
        /(?:Rs\.?\s*|PKR\s*|₹\s*|[$€£¥₽₩￥]\s*)[,\d]+(?:\.\d{1,2})?/gi,
        /[,\d]+(?:\.\d{1,2})?\s*(?:Rs\.?|PKR|₹|[$€£¥₽₩￥])/gi,
        /(?:From|Starting at|Price:)\s*(?:Rs\.?\s*|PKR\s*|₹\s*|[$€£¥₽₩￥]\s*)?[,\d]+(?:\.\d{1,2})?/gi,
      ];

      for (const pattern of patterns) {
        const match = priceText.match(pattern);
        if (match) return match[0].trim();
      }

      return priceText;
    }

    default:
      return element.textContent?.trim() || element.value || "";
  }
}

function generateSelector(element) {
  const selectors = [];

  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className && typeof element.className === "string") {
    const classes = element.className
      .split(" ")
      .filter(
        (c) =>
          c.trim() && !c.match(/^(active|hover|selected|focus|extractor-)$/)
      )
      .slice(0, 3);
    if (classes.length > 0) {
      selectors.push(element.tagName.toLowerCase() + "." + classes.join("."));
    }
  }

  const path = [];
  let current = element;
  while (current && current !== document.body && path.length < 4) {
    const tag = current.tagName.toLowerCase();
    path.unshift(tag);
    current = current.parentElement;
  }

  return path.join(" > ");
}

function startSelection(field) {
  console.log("Starting selection for field:", field);
  currentField = field;
  isSelecting = true;
  document.body.classList.add("extractor-selecting");

  showSelectionOverlay(field);
}

function stopSelection() {
  console.log("Stopping selection");
  isSelecting = false;
  currentField = null;
  document.body.classList.remove("extractor-selecting");

  // Clean up any hover effects
  if (lastHoveredElement) {
    lastHoveredElement.classList.remove("extractor-hover");
    lastHoveredElement = null;
  }

  hideSelectionOverlay();
}

function showSelectionOverlay(field) {
  hideSelectionOverlay();

  const overlay = document.createElement("div");
  overlay.className = "extractor-overlay";
  overlay.id = "extractor-selection-overlay";
  overlay.textContent = `🎯 Click to select ${field}`;

  document.body.appendChild(overlay);

  setTimeout(() => {
    const existingOverlay = document.getElementById(
      "extractor-selection-overlay"
    );
    if (existingOverlay) {
      existingOverlay.style.opacity = "0.8";
    }
  }, 3000);
}

function hideSelectionOverlay() {
  const overlay = document.getElementById("extractor-selection-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function findSimilar() {
  console.log("Finding similar elements...");

  if (extractionMode !== "template") {
    console.log("Find similar only works in template mode");
    return;
  }

  const templateFields = Object.keys(currentTemplate).filter(
    (field) => currentTemplate[field]
  );

  if (templateFields.length === 0) {
    console.log("No template fields set");
    return;
  }

  // Implementation of finding similar elements...
  // (keeping it simple for now)
  sendToHost("data-extracted", {
    message: "Find similar functionality to be implemented",
  });
}

function clearHighlights() {
  console.log("Clearing highlights");

  highlightedElements.forEach((element) => {
    element.classList.remove(
      "extractor-selected",
      "extractor-similar",
      "extractor-hover"
    );
  });
  highlightedElements = [];
  extractedData = [];
  currentTemplate = {
    image: null,
    title: null,
    description: null,
    price: null,
  };

  if (lastHoveredElement) {
    lastHoveredElement.classList.remove("extractor-hover");
    lastHoveredElement = null;
  }
}

function setExtractionMode(mode) {
  extractionMode = mode;
  console.log("Extraction mode set to:", mode);
}

console.log("Webview preload script initialized");
