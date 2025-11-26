// Stealth preload script to bypass Cloudflare and bot detection
// This script hides automation markers and makes the webview appear as a regular browser

(function () {
  "use strict";

  console.log("🥷 Stealth mode activated");

  // Override navigator.webdriver to hide automation
  try {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
      configurable: true,
    });
  } catch (e) {
    console.log("Could not override webdriver property");
  }

  // Hide Chrome automation extension
  if (window.chrome && window.chrome.runtime) {
    try {
      Object.defineProperty(window.chrome, "runtime", {
        get: () => undefined,
        configurable: true,
      });
    } catch (e) {
      // Ignore errors when overriding navigator properties
    }
  }

  // Make the window.chrome object look more authentic
  if (!window.chrome) {
    window.chrome = {};
  }

  // Add realistic Chrome properties
  window.chrome.app = {
    isInstalled: false,
    InstallState: {
      DISABLED: "disabled",
      INSTALLED: "installed",
      NOT_INSTALLED: "not_installed",
    },
    RunningState: {
      CANNOT_RUN: "cannot_run",
      READY_TO_RUN: "ready_to_run",
      RUNNING: "running",
    },
  };

  // Override permissions query to appear as normal browser
  try {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

    // Hide CDP (Chrome DevTools Protocol) detection
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function () {
      if (this === window.navigator.permissions.query) {
        return "function query() { [native code] }";
      }
      return originalToString.call(this);
    };
  } catch (e) {
    console.log("Permissions override skipped");
  }

  // Make plugins appear realistic
  try {
    Object.defineProperty(navigator, "plugins", {
      get: () => [
        {
          0: {
            type: "application/pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
          },
          description: "Portable Document Format",
          filename: "internal-pdf-viewer",
          length: 1,
          name: "Chrome PDF Plugin",
        },
        {
          0: {
            type: "application/x-google-chrome-pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
          },
          description: "Portable Document Format",
          filename: "internal-pdf-viewer",
          length: 1,
          name: "Chrome PDF Viewer",
        },
        {
          0: {
            type: "application/x-nacl",
            suffixes: "",
            description: "Native Client Executable",
          },
          1: {
            type: "application/x-pnacl",
            suffixes: "",
            description: "Portable Native Client Executable",
          },
          description: "",
          filename: "internal-nacl-plugin",
          length: 2,
          name: "Native Client",
        },
      ],
      configurable: true,
    });
  } catch (e) {
    // Ignore errors when overriding navigator properties
  }

  // Make languages appear realistic
  try {
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
      configurable: true,
    });
  } catch (e) {
    // Ignore errors when overriding navigator properties
  }

  // Override hardwareConcurrency to appear more realistic
  try {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get: () => 8,
      configurable: true,
    });
  } catch (e) {
    // Ignore errors when overriding navigator properties
  }

  // Add realistic connection properties
  try {
    Object.defineProperty(navigator, "connection", {
      get: () => ({
        effectiveType: "4g",
        rtt: 50,
        downlink: 10,
        saveData: false,
      }),
      configurable: true,
    });
  } catch (e) {
    // Ignore errors when overriding navigator properties
  }

  // Hide automation in window.navigator properties
  delete navigator.__proto__.webdriver;

  // Override Notification permission
  const originalNotification = window.Notification;
  if (originalNotification) {
    Object.defineProperty(window, "Notification", {
      get: () => originalNotification,
      configurable: true,
    });
    Object.defineProperty(Notification, "permission", {
      get: () => "default",
      configurable: true,
    });
  }

  // Make iframe contentWindow behave normally
  try {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      // Hide WebGL vendor/renderer that might expose automation
      if (parameter === 37445) {
        return "Intel Inc.";
      }
      if (parameter === 37446) {
        return "Intel Iris OpenGL Engine";
      }
      return getParameter.call(this, parameter);
    };
  } catch (e) {
    console.log("WebGL override not needed");
  }

  // Add realistic battery API
  if (!navigator.getBattery) {
    navigator.getBattery = () =>
      Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });
  }

  // Override console.debug to hide potential detection
  const originalDebug = console.debug;
  console.debug = function () {
    if (
      arguments[0] &&
      typeof arguments[0] === "string" &&
      arguments[0].includes("DevTools")
    ) {
      return;
    }
    return originalDebug.apply(this, arguments);
  };

  // Add mouse move events to simulate human behavior
  document.addEventListener(
    "mousemove",
    () => {
      // Track mouse movements for stealth
    },
    { passive: true, capture: true }
  );

  // Prevent detection via performance.now() patterns
  const originalNow = Performance.prototype.now;
  let nowOffset = 0;
  Performance.prototype.now = function () {
    nowOffset += Math.random() * 0.1;
    return originalNow.call(this) + nowOffset;
  };

  // Hide headless Chrome detection
  if (!window.outerWidth || !window.outerHeight) {
    Object.defineProperty(window, "outerWidth", {
      get: () => window.screen.availWidth,
      configurable: true,
    });
    Object.defineProperty(window, "outerHeight", {
      get: () => window.screen.availHeight,
      configurable: true,
    });
  }

  // Add realistic screen properties
  Object.defineProperty(screen, "availTop", {
    get: () => 0,
    configurable: true,
  });
  Object.defineProperty(screen, "availLeft", {
    get: () => 0,
    configurable: true,
  });

  // Hide the fact that we're in an iframe/webview (DISABLED - can cause crashes)
  // These overrides can conflict with some sites, so we skip them
  // The other stealth features are enough to pass Cloudflare

  /*
  try {
    Object.defineProperty(window, 'top', {
      get: () => window,
      configurable: true
    });
  } catch (e) {}

  try {
    Object.defineProperty(window, 'frameElement', {
      get: () => null,
      configurable: true
    });
  } catch (e) {}
  */

  // Ensure document.readyState and events work properly
  // Fix potential rendering issues
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("🎨 DOM loaded, rendering enabled");
    });
  }

  // Override document.hidden to ensure page renders
  try {
    Object.defineProperty(document, "hidden", {
      get: () => false,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      get: () => "visible",
      configurable: true,
    });
  } catch (e) {
    // Ignore errors when overriding document properties
  }

  // Ensure proper page visibility for rendering
  try {
    window.addEventListener(
      "load",
      () => {
        console.log("🎨 Page fully loaded and visible");
        // Trigger any lazy-loaded content gently
        try {
          window.dispatchEvent(new Event("focus"));
          document.dispatchEvent(new Event("visibilitychange"));
        } catch (e) {
          console.log("Could not dispatch visibility events");
        }
      },
      { once: true }
    );
  } catch (e) {
    console.log("Load event listener failed");
  }

  console.log("🥷 Stealth mode complete - Browser fingerprint normalized");
})();
