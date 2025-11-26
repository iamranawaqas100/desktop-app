import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import MainLayout from "./components/MainLayout";
import { Button } from "./components/ui-lib/ui/button";
import EnvironmentIndicator from "./components/EnvironmentIndicator";
import { useExtractionStore, useUrlStore } from "./store";
import { joinUrl } from "./lib/utils";

// Extend Window interface for TypeScript
// (Actual type definition is in types.d.ts)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false); // ⭐ NEW: Loading state for mode transitions
  const [isAwaitingAuth, setIsAwaitingAuth] = useState(false); // ⭐ NEW: Waiting for browser auth
  const [, setUser] = useState<any>(null);
  const { webAppUrl, isLocalhost, toggleUrl } = useUrlStore();
  const [isDevMode, setIsDevMode] = useState(false);
  const { setExtractedData, setCollectionContext, setCurrentMode, setUser: setGlobalUser } =
    useExtractionStore();

  console.log("🚀 App component rendering, state:", {
    isAuthenticated,
    isLoading,
    isDevMode,
    isSwitchingMode,
    isAwaitingAuth,
  });

  /**
   * ⭐ ENHANCED: Store pending action with expiry timestamp
   * Pending actions expire after 15 minutes by default
   */
  const storePendingAction = (
    type: "Collection" | "Extraction" | "ViewAIMenu",
    data: any,
    expiryMinutes: number = 15
  ) => {
    const pendingAction = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
    };
    localStorage.setItem(`pending${type}`, JSON.stringify(pendingAction));
    console.log(
      `📌 Stored pending ${type} (expires in ${expiryMinutes} minutes)`
    );
  };

  /**
   * ⭐ ENHANCED: Retrieve pending action with expiry check
   * Returns null if action has expired
   */
  const retrievePendingAction = (
    type: "Collection" | "Extraction" | "ViewAIMenu"
  ): any | null => {
    const key = `pending${type}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    try {
      const pendingAction = JSON.parse(stored);

      // Check if action has expiry info (new format)
      if (pendingAction.expiresAt) {
        const now = Date.now();
        const timeRemaining = pendingAction.expiresAt - now;

        if (timeRemaining <= 0) {
          console.warn(`⚠️ Pending ${type} has expired, removing...`);
          localStorage.removeItem(key);
          return null;
        }

        console.log(
          `📌 Retrieved pending ${type} (expires in ${Math.round(timeRemaining / 1000 / 60)} minutes)`
        );
        return pendingAction.data;
      } else {
        // Old format without expiry - still process it but add warning
        console.warn(
          `⚠️ Pending ${type} is in old format (no expiry), processing anyway`
        );
        return pendingAction;
      }
    } catch (error) {
      console.error(`❌ Failed to parse pending ${type}:`, error);
      localStorage.removeItem(key);
      return null;
    }
  };

  // Get API URL and check for dev mode on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load API URL
        if (window.electronAPI?.getApiUrl) {
          const apiUrl = await window.electronAPI.getApiUrl();
          console.log("🌐 API URL loaded:", apiUrl);

          // Only sync if no local preference exists (prevent overwriting user toggle)
          const savedUrl = localStorage.getItem("webAppUrl");
          if (!savedUrl && apiUrl && apiUrl !== webAppUrl) {
            useUrlStore.getState().setWebAppUrl(apiUrl);
          }
        }

        // Check if running in development mode
        if (window.electronAPI?.isDevMode) {
          const devMode = await window.electronAPI.isDevMode();
          console.log("🔧 Dev mode:", devMode);
          setIsDevMode(devMode);

          if (devMode) {
            console.log(
              "🔧 DEV MODE ENABLED - Auto-authenticating with mock user"
            );

            // Create mock user for development
            const mockUser = {
              _id: "dev-user-mock-id",
              name: "Developer",
              email: "dev@localhost.com",
              role: "admin",
            };

            const mockAuthData = {
              user: mockUser,
              sessionToken: "dev-mock-token-12345",
              signature: "dev-mock-signature",
              expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
            };

            localStorage.setItem("authData", JSON.stringify(mockAuthData));
            setUser(mockUser);
            setIsAuthenticated(true);
            setIsLoading(false);
            loadData();

            console.log("✅ Dev mode: Auto-authenticated as", mockUser.name);
          }
        }
      } catch (error) {
        console.error("❌ Error loading config:", error);
      }
    };
    loadConfig();

    // ⭐ ENHANCED: Listen for auth expiration event from API client
    const handleAuthExpired = () => {
      console.log("⚠️ Auth expired event received, logging out...");
      setUser(null);
      setGlobalUser(null); // Sync to global store
      setIsAuthenticated(false);
      setIsLoading(false);
      setIsAwaitingAuth(false);

      // Show user-friendly message
      alert("Your session has expired. Please log in again.");
    };

    window.addEventListener("auth-expired", handleAuthExpired);

    // ⭐ ENHANCED: Listen for auth changes in localStorage (Dynamic User Switching)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authData") {
        console.log("🔄 Auth data changed in storage, re-checking auth...");
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
      window.removeEventListener("storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize API client with current URL
  useEffect(() => {
    import("./lib/api-client").then(({ apiClient }) => {
      apiClient.setBaseURL(webAppUrl);
    });
  }, [webAppUrl]);

  // Keyboard shortcut handler: Ctrl+Shift+S (or Cmd+Shift+S on Mac) to toggle URL
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+S (Windows/Linux) or Cmd+Shift+S (Mac)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "S"
      ) {
        event.preventDefault();

        // ⭐ Reset session before switching environment
        resetAppSession();

        toggleUrl();

        // Show notification in console
        const env = isLocalhost ? "QA" : "Localhost";
        const newEnv = !isLocalhost ? "QA" : "Localhost";
        console.log(`🔄 Switched from ${env} to ${newEnv} (Session Reset)`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleUrl, isLocalhost]);

  useEffect(() => {
    console.log("🔄 App mounted, checking authentication...");
    console.log("📦 electronAPI available:", !!window.electronAPI);

    // Skip checkAuth if dev mode will handle it
    if (!isDevMode) {
      checkAuth();
    }

    // Listen for protocol URL events from main process
    if (window.electronAPI?.onProtocolUrl) {
      window.electronAPI.onProtocolUrl((url: string) => {
        console.log("🔗 Protocol URL received:", url);
        parseProtocolUrl(url);
      });
    }

    // Listen for auth callback from protocol handler
    window.electronAPI?.onAuthCallback?.((authData: any) => {
      console.log("🔐 Auth callback received:", authData);
      handleAuthCallback(authData);
    });

    // Listen for AI collection callback from protocol handler
    window.electronAPI?.onAICollectionCallback?.((collectionData: any) => {
      console.log("🤖 AI Collection callback received:", collectionData);
      handleAICollectionCallback(collectionData);
    });

    // Listen for view AI menu callback from protocol handler
    window.electronAPI?.onViewAIMenu?.((viewData: any) => {
      console.log("👁️ View AI Menu callback received:", viewData);
      processViewAIMenu(viewData);
    });

    // Listen for manual extraction callback from protocol handler
    console.log("🔌 Registering onProtocolExtract listener...");
    window.electronAPI?.onProtocolExtract?.((_event: any, data: any) => {
      console.log(" ");
      console.log("═══════════════════════════════════════════");
      console.log("🎯 PROTOCOL EXTRACT EVENT RECEIVED!");
      console.log("═══════════════════════════════════════════");
      console.log("📦 Data:", JSON.stringify(data, null, 2));
      console.log("═══════════════════════════════════════════");
      console.log(" ");
      handleManualExtraction(data);
    });
    console.log("✅ onProtocolExtract listener registered");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Event handlers intentionally omitted - listeners register once on mount
  }, [isDevMode]);

  /**
   * Parse protocol URL and route to appropriate handler
   * ⭐ ENHANCED: Better error handling and validation
   */
  const parseProtocolUrl = (url: string) => {
    try {
      console.log("🔍 Parsing protocol URL:", url);

      // Validate URL format
      if (!url || typeof url !== "string") {
        throw new Error("Invalid protocol URL: URL is empty or not a string");
      }

      if (!url.startsWith("dataextractor://")) {
        throw new Error(
          `Invalid protocol URL: Must start with 'dataextractor://', got: ${url.substring(0, 50)}`
        );
      }

      // Remove protocol prefix
      const urlWithoutProtocol = url.replace(/^dataextractor:\/\//, "");
      const [action, queryString] = urlWithoutProtocol.split("?");

      // Remove trailing slash from action
      const cleanAction = action.replace(/\/$/, "");

      console.log("📝 Action:", cleanAction);
      console.log("📝 Query string:", queryString);

      // Validate action
      if (!cleanAction) {
        throw new Error("Invalid protocol URL: No action specified");
      }

      // Some actions may not require query parameters (e.g., simple triggers)
      if (!queryString) {
        console.warn("⚠️ No query string found in protocol URL");
        // Allow certain actions without query strings
        const actionsWithoutParams = ["refresh", "sync"];
        if (!actionsWithoutParams.includes(cleanAction)) {
          throw new Error(`Action '${cleanAction}' requires query parameters`);
        }
      }

      // Parse query parameters
      const params = new URLSearchParams(queryString || "");
      const data: any = {};
      params.forEach((value, key) => {
        try {
          data[key] = decodeURIComponent(value);
        } catch (decodeError) {
          console.warn(`⚠️ Failed to decode parameter '${key}':`, decodeError);
          data[key] = value; // Use raw value if decode fails
        }
      });

      console.log("📦 Parsed data:", data);

      // Route to appropriate handler based on action
      switch (cleanAction) {
        case "auth":
        case "auth-callback":
          console.log("🔐 Routing to auth callback handler");
          // Validate required fields for auth
          if (!data.code || !data.state) {
            throw new Error(
              "Auth callback missing required parameters: code and state"
            );
          }
          handleAuthCallback(data);
          break;

        case "extract":
          console.log("🎯 Routing to manual extraction handler");
          // Validate required fields for extraction
          if (!data.url || !data.restaurantId || !data.sourceId) {
            throw new Error(
              "Manual extraction missing required parameters: url, restaurantId, sourceId"
            );
          }
          handleManualExtraction({
            url: data.url,
            restaurantId: data.restaurantId,
            sourceId: data.sourceId,
            restaurantName: data.restaurantName || "Unknown Restaurant",
          });
          break;

        case "view-ai-menu":
          console.log("👁️ Routing to view AI menu handler");
          // Validate required fields for QC 1
          if (!data.restaurant_id || !data.source_id) {
            throw new Error(
              "View AI menu missing required parameters: restaurant_id, source_id"
            );
          }
          processViewAIMenu({
            restaurantId: data.restaurant_id,
            sourceId: data.source_id,
            restaurantName: data.restaurant_name || "Unknown Restaurant",
            sourceUrl: data.source_url || "",
          });
          break;

        case "ai-collection-callback":
          console.log("🤖 Routing to AI collection callback handler");
          // Validate required fields
          if (!data.restaurantId || !data.sourceId) {
            throw new Error(
              "AI collection callback missing required parameters: restaurantId, sourceId"
            );
          }
          handleAICollectionCallback(data);
          break;

        default:
          throw new Error(`Unknown protocol action: ${cleanAction}`);
      }
    } catch (error) {
      console.error("❌ Error parsing protocol URL:", error);

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(
        `Failed to process protocol URL:\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`
      );

      // Optionally log to a service for debugging
      console.error("Full error details:", {
        url,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const checkAuth = () => {
    const authData = localStorage.getItem("authData");

    if (!authData) {
      console.log("❌ Not authenticated");
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(authData);
      const expiresAt = parsed.expiresAt || 0;

      if (Date.now() < expiresAt) {
        console.log("✅ Auth valid, loading data...");
        console.log("✅ Auth valid, loading data...");
        setUser(parsed.user);
        setGlobalUser(parsed.user); // Sync to global store
        setIsAuthenticated(true);
        loadData();
      } else {
        console.log("⏰ Auth expired");
        localStorage.removeItem("authData");
        localStorage.removeItem("authData");
        setIsAuthenticated(false);
        setUser(null);
        setGlobalUser(null); // Sync to global store
        setIsLoading(false);
      }
    } catch (error) {
      console.error("❌ Error parsing auth data:", error);
      localStorage.removeItem("authData");
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const handleAuthCallback = async (authData: any) => {
    try {
      console.log("🔄 Processing auth callback...", authData);

      // ⭐ Clear awaiting auth state
      setIsAwaitingAuth(false);

      // Get the stored challenge
      const storedChallenge = localStorage.getItem("authChallenge");
      const storedState = localStorage.getItem("authState");

      console.log("📝 Stored challenge:", storedChallenge);
      console.log("📝 Stored state:", storedState);
      console.log("📝 Received state:", authData.state);

      // Verify state matches
      if (authData.state !== storedState) {
        console.error("❌ State mismatch!");
        throw new Error("State verification failed");
      }

      // Exchange auth code for session token
      const url = `${joinUrl(webAppUrl, "/api/auth/desktop/authorize")}?code=${authData.code}&challenge=${storedChallenge}`;
      console.log("🌐 Calling:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API error:", errorData);
        throw new Error(errorData.error || "Failed to exchange auth code");
      }

      const tokenData = await response.json();
      console.log("✅ Token data received:", tokenData);

      // Store auth data
      const authDataToStore = {
        user: tokenData.user,
        sessionToken: tokenData.sessionToken,
        signature: tokenData.signature,
        expiresAt: Date.now() + tokenData.expiresIn * 1000,
      };

      localStorage.setItem("authData", JSON.stringify(authDataToStore));

      // Clean up challenge and state
      localStorage.removeItem("authChallenge");
      localStorage.removeItem("authState");

      setUser(tokenData.user);
      setGlobalUser(tokenData.user); // Sync to global store
      setIsAuthenticated(true);
      setIsLoading(false);
      loadData();

      // Check for pending extraction or collection after successful login
      const pendingCollection = retrievePendingAction("Collection");
      if (pendingCollection) {
        console.log("🔄 Processing pending AI collection after login");
        localStorage.removeItem("pendingCollection");
        processAICollection(pendingCollection);
      }

      // Check for pending view AI menu after successful login
      const pendingViewAIMenu = retrievePendingAction("ViewAIMenu");
      if (pendingViewAIMenu) {
        console.log("🔄 Processing pending view AI menu after login");
        localStorage.removeItem("pendingViewAIMenu");
        processViewAIMenu(pendingViewAIMenu);
      }

      const pendingExtraction = retrievePendingAction("Extraction");
      if (pendingExtraction) {
        console.log("🔄 Processing pending manual extraction after login");
        localStorage.removeItem("pendingExtraction");
        handleManualExtraction(pendingExtraction);
      }

      console.log("✅ Authentication successful!");
    } catch (error) {
      console.error("❌ Auth callback error:", error);
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Authentication failed: ${errorMessage}\n\nPlease try again.`);
    }
  };

  const loadData = async () => {
    try {
      console.log("📥 Loading data via API...");

      // Get collection context from store
      const { collectionContext } = useExtractionStore.getState();

      // If no collection context, return empty array
      if (
        !collectionContext ||
        !collectionContext.restaurantId ||
        !collectionContext.sourceId
      ) {
        console.log("⚠️ No collection context available, skipping data load");
        setExtractedData([]);
        setIsLoading(false);
        return;
      }

      // Use API client to get data (no more direct MongoDB/electron API access!)
      const { getMenuItems } = await import("./services/menu-items");

      const items = await getMenuItems({
        restaurantId: collectionContext.restaurantId,
        sourceId: collectionContext.sourceId,
        isAIVerification: collectionContext.hasAIData || false,
      });

      console.log("✅ Data loaded via API:", items?.length || 0, "items");
      setExtractedData((items as any) || []);
    } catch (error) {
      console.error("❌ Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    // Generate challenge for PKCE-like flow
    const challenge = crypto.randomUUID();
    const state = crypto.randomUUID();

    // Store challenge and state for verification
    localStorage.setItem("authChallenge", challenge);
    localStorage.setItem("authState", state);

    // ⭐ Set awaiting auth state to show banner
    setIsAwaitingAuth(true);

    // Open web browser for authentication
    const authUrl = `${joinUrl(webAppUrl, "/auth/desktop")}?state=${state}&challenge=${challenge}&client_id=desktop-app`;

    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(authUrl);
    } else {
      window.open(authUrl, "_blank");
    }
  };

  /**
   * Reset application state before loading a new collection/session
   * This ensures clean state when switching between:
   * - QC 1 (verification mode) → Manual Collection
   * - Manual Collection → QC 1
   * - Any collection → Another collection
   */
  const resetAppSession = () => {
    console.log("🧹 Resetting app session...");

    // ⭐ Show loading indicator during mode transition
    setIsSwitchingMode(true);

    // Clear store state
    setExtractedData([]);
    setCollectionContext(null);
    setCurrentMode("manual");

    // Clear any selection/editing state via store
    const { setSelectedField, setCurrentItemId } =
      useExtractionStore.getState();
    setSelectedField(null);
    setCurrentItemId(null);

    // Clear webview by dispatching reset event to MainLayout
    // This will set currentUrl to empty, effectively clearing the webview
    window.dispatchEvent(new CustomEvent("reset-webview"));

    // ⭐ FIX: Slightly longer delay to ensure webview is fully reset before hiding loading
    setTimeout(() => {
      setIsSwitchingMode(false);
      console.log("✅ App session reset complete");
    }, 500); // Increased from 300ms to 500ms for better stability
  };

  const handleAICollectionCallback = async (collectionData: any) => {
    console.log("🤖 Processing AI collection callback...", collectionData);

    // Check if user is authenticated
    const authData = localStorage.getItem("authData");

    if (!authData) {
      console.log(
        "❌ Not authenticated, storing collection data and redirecting to login"
      );
      // Store collection data for after login with expiry
      storePendingAction("Collection", collectionData);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // User is authenticated, proceed with collection
    await processAICollection(collectionData);
  };

  const handleManualExtraction = (data: any) => {
    console.log(" ");
    console.log("🎯🎯🎯 PROCESSING MANUAL EXTRACTION 🎯🎯🎯");
    console.log("📦 Raw data:", data);
    console.log("🔑 restaurantId:", data.restaurantId);
    console.log("🔑 sourceId:", data.sourceId);
    console.log("🔑 restaurantName:", data.restaurantName);
    console.log("🔑 URL:", data.url);
    console.log(" ");

    // Check if user is authenticated
    const authData = localStorage.getItem("authData");

    if (!authData) {
      console.log(
        "❌ Not authenticated, storing extraction data and redirecting to login"
      );
      // Store extraction data for after login with expiry
      storePendingAction("Extraction", data);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // ⭐ CRITICAL FIX: Reset session before loading new collection
    // This fixes the bug where source doesn't load after QC 1
    resetAppSession();

    // Wait for reset to complete before setting new context
    setTimeout(() => {
      // Set collection context for pure manual collection (no AI data)
      console.log("📝 Setting collection context:", {
        restaurantId: data.restaurantId,
        sourceId: data.sourceId,
        restaurantName: data.restaurantName,
      });

      setCollectionContext({
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName || "Unknown Restaurant",
        collectionId: data.collectionId,
        collectionName: data.collectionName || "",
        quarterId: data.quarterId,
        quarterName: data.quarterName || "",
        sourceId: data.sourceId,
        sourceUrl: data.url,
        hasAIData: false, // This is pure manual collection
      });

      // Set mode to manual
      setCurrentMode("manual");

      // User is authenticated, open the URL directly
      console.log("🌐 Opening source URL:", data.url);

      // Dispatch event to MainLayout to load the URL
      window.dispatchEvent(
        new CustomEvent("open-source-url", {
          detail: data.url,
        })
      );

      // Load existing data from MongoDB (if any)
      console.log("📥 Loading existing data from MongoDB...");
      setTimeout(() => {
        loadData();
      }, 300); // Small delay to ensure context is set in store

      // Show notification
      console.log(`✅ Manual Collection Started for ${data.restaurantName}`);
    }, 600); // Wait for reset to complete (500ms reset + 100ms buffer)
  };

  const processViewAIMenu = async (viewData: any) => {
    console.log("👁️ Processing view AI menu request...", viewData);

    // ⭐ CRITICAL FIX: Reset session before loading new collection
    // This ensures clean state when switching from manual → QC 1
    resetAppSession();

    // Clear existing data before loading new data
    console.log("🧹 Clearing existing data...");
    setExtractedData([]);
    setIsLoading(true);

    // Set collection context for AI verification mode (simplified - only what we need)
    console.log("📝 Setting collection context for AI verification:", {
      restaurantId: viewData.restaurantId,
      sourceId: viewData.sourceId,
      restaurantName: viewData.restaurantName,
      sourceUrl: viewData.sourceUrl,
    });

    setCollectionContext({
      restaurantId: viewData.restaurantId,
      restaurantName: viewData.restaurantName || "Unknown Restaurant",
      sourceId: viewData.sourceId,
      sourceUrl: viewData.sourceUrl || "",
      hasAIData: true, // This is AI verification mode
      collectionId: "", // Not needed for API calls
      collectionName: "",
    });

    // Set mode to verification
    setCurrentMode("verification");

    try {
      console.log("📥 Loading QC merged items (AI + Manual) via API...");

      // ⭐ Load QC merged data directly with sourceId
      const { getQCMergedItems, transformQCItemToExtractedItem } = await import(
        "./services/qc-verification"
      );

      const qcData = await getQCMergedItems(viewData.sourceId);

      console.log(
        "✅ QC merged items loaded:",
        qcData.items?.length || 0,
        "items"
      );
      console.log("📊 Progress:", qcData.stats);

      // Transform to ExtractedItem format
      const transformedItems = qcData.items.map((item, index) =>
        transformQCItemToExtractedItem(item, index)
      );

      setExtractedData(transformedItems);

      // Store progress in localStorage for persistence
      localStorage.setItem("qcProgress", JSON.stringify(qcData.stats));

      // Open source URL in browser
      if (viewData.sourceUrl) {
        console.log("🌐 Opening source URL:", viewData.sourceUrl);
        // Add a small delay to ensure MainLayout is mounted and ready
        setTimeout(() => {
          console.log("🌐 Dispatching open-source-url event...");
          window.dispatchEvent(
            new CustomEvent("open-source-url", {
              detail: viewData.sourceUrl,
            })
          );
        }, 500);
      } else {
        console.warn("⚠️ No sourceUrl provided in viewData!");
      }

      console.log(`✅ QC Mode Started for ${viewData.restaurantName}`);
      console.log(
        `📊 Progress: ${qcData.stats.verified}/${qcData.stats.total} verified (${qcData.stats.percentComplete}%)`
      );
    } catch (error) {
      console.error("❌ Error loading QC merged items:", error);
      alert(
        `Failed to fetch QC data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const processAICollection = async (collectionData: any) => {
    try {
      console.log("📥 Fetching AI-extracted menu items from API...");

      // ⭐ CRITICAL FIX: Reset session before loading new collection
      resetAppSession();

      // Store collection context for later use
      localStorage.setItem("currentCollection", JSON.stringify(collectionData));

      // Set collection context in store
      setCollectionContext({
        restaurantId: collectionData.restaurantId,
        restaurantName: collectionData.restaurantName,
        collectionId: collectionData.collectionId,
        collectionName: collectionData.collectionName || "",
        quarterId: collectionData.quarterId,
        quarterName: collectionData.quarterName || "",
        sourceId: collectionData.sourceId,
        sourceUrl: collectionData.sourceUrl,
        hasAIData: true, // This is AI collection, so we have AI data
      });

      // Set mode to verification since we have AI data
      setCurrentMode("verification");

      let menuItems = [];

      try {
        // Get auth token
        const authData = localStorage.getItem("authData");
        const sessionToken = authData
          ? JSON.parse(authData).sessionToken
          : null;

        const response = await fetch(
          `${joinUrl(webAppUrl, "/api/menu-items/ai")}?restaurantId=${collectionData.restaurantId}&sourceId=${collectionData.sourceId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(sessionToken
                ? { Authorization: `Bearer ${sessionToken}` }
                : {}),
            },
          }
        );

        if (response.ok) {
          const menuData = await response.json();
          menuItems = menuData.items || [];
          console.log("✅ AI menu items received from API:", menuItems.length);
        } else {
          throw new Error(`API returned status: ${response.status}`);
        }
      } catch (apiError) {
        console.warn("⚠️ API fetch failed, using local mock data:", apiError);

        // Generate local mock data for manual QC
        menuItems = generateMockMenuItems(
          collectionData.restaurantId,
          collectionData.sourceId
        );
        console.log("✅ Generated local mock data:", menuItems.length, "items");
      }

      // Convert AI menu items to ExtractedItem format
      const formattedItems = menuItems.map((item: any, index: number) => ({
        id: index + 1,
        _id: item._id, // MongoDB AI item ID
        title: item.name || "",
        description: item.description || "",
        image: item.imageUrl || "",
        price: item.price?.toString() || "0",
        category:
          item.category || item.menuHeaderName || item.masterHeaderName || "",
        url: collectionData.sourceUrl || "",
        timestamp: item.createdAt || new Date().toISOString(),
        verified: item.verified || false, // From MenuItemAI schema
        collectionRestaurantId: item.collectionRestaurantId, // ⭐ New schema field
        sourceId: item.sourceId,
        currency: item.currency || "USD",
        masterHeaderId: item.masterHeaderId,
        masterHeaderName: item.masterHeaderName,
        menuHeaderName: item.menuHeaderName,
        sourceUrl: item.sourceUrl,
        sizes: item.sizes, // ⭐ New schema field
        priceLabels: item.priceLabels, // ⭐ New schema field
        isManual: false, // These are AI items
        aiItemId: item._id, // ⭐ Store AI item ID for verification
        // AI-specific fields
        confidence: item.confidence,
        hasConflict: item.hasConflict,
        needsReview: item.needsReview,
      }));

      // Store menu items in extraction store
      setExtractedData(formattedItems);

      // Open the source URL in the app silently (no alert)
      console.log(
        "🌐 Opening source URL for verification:",
        collectionData.sourceUrl
      );

      // Dispatch event to MainLayout to load the source URL in webview
      window.dispatchEvent(
        new CustomEvent("open-source-url", {
          detail: collectionData.sourceUrl,
        })
      );
    } catch (error) {
      console.error("❌ Error processing AI collection:", error);
      alert(
        `❌ Failed to load collection data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  // Generate mock menu items locally
  const generateMockMenuItems = (restaurantId: string, sourceId: string) => {
    const mockItems = [
      {
        name: "Classic Burger",
        category: "Burgers",
        price: "$12.99",
        description: "Juicy beef patty with lettuce, tomato, and cheese",
      },
      {
        name: "Caesar Salad",
        category: "Salads",
        price: "$9.99",
        description: "Fresh romaine with parmesan and croutons",
      },
      {
        name: "Margherita Pizza",
        category: "Pizza",
        price: "$14.99",
        description: "Fresh mozzarella, basil, and tomato sauce",
      },
      {
        name: "Grilled Chicken",
        category: "Mains",
        price: "$16.99",
        description: "Herb-marinated grilled chicken breast",
      },
      {
        name: "Pasta Carbonara",
        category: "Pasta",
        price: "$13.99",
        description: "Creamy pasta with bacon and parmesan",
      },
      {
        name: "Fish & Chips",
        category: "Seafood",
        price: "$15.99",
        description: "Crispy battered fish with golden fries",
      },
      {
        name: "Chocolate Cake",
        category: "Desserts",
        price: "$7.99",
        description: "Rich chocolate layer cake",
      },
      {
        name: "Ice Cream Sundae",
        category: "Desserts",
        price: "$6.99",
        description: "Vanilla ice cream with toppings",
      },
      {
        name: "Steak Frites",
        category: "Mains",
        price: "$24.99",
        description: "Grilled ribeye with french fries",
      },
      {
        name: "Veggie Wrap",
        category: "Appetizers",
        price: "$10.99",
        description: "Fresh vegetables in a whole wheat wrap",
      },
      {
        name: "Chicken Wings",
        category: "Appetizers",
        price: "$11.99",
        description: "Spicy buffalo wings with ranch",
      },
      {
        name: "Greek Salad",
        category: "Salads",
        price: "$10.99",
        description: "Feta cheese, olives, and fresh vegetables",
      },
      {
        name: "Pepperoni Pizza",
        category: "Pizza",
        price: "$16.99",
        description: "Classic pepperoni with mozzarella",
      },
      {
        name: "Shrimp Scampi",
        category: "Seafood",
        price: "$18.99",
        description: "Garlic butter shrimp over linguine",
      },
      {
        name: "Tiramisu",
        category: "Desserts",
        price: "$8.99",
        description: "Italian coffee-flavored dessert",
      },
    ];

    return mockItems.map((item, index) => ({
      _id: `mock-${index + 1}`,
      ...item,
      restaurantId,
      sourceId,
      extractedAt: new Date().toISOString(),
      status: "needs-qc",
      source: "mock-data",
      notes: "Generated for manual QC - AI extraction pending",
    }));
  };

  // Check for pending collection after successful auth
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const pendingCollection = retrievePendingAction("Collection");
      if (pendingCollection) {
        console.log("🔄 Processing pending collection after auth");
        localStorage.removeItem("pendingCollection");
        processAICollection(pendingCollection);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // processAICollection intentionally omitted - only runs when auth state changes
  }, [isAuthenticated, isLoading]);

  console.log("📊 App state:", { isLoading, isAuthenticated });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <EnvironmentIndicator />
        <div className="text-center">
          <div className="h-12 w-12 rounded-lg mx-auto mb-4 gradient-primary animate-pulse" />
          <p className="text-foreground text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <EnvironmentIndicator />
        <div className="max-w-md w-full p-8 text-center">
          {/* ⭐ Auth Flow Banner */}
          {isAwaitingAuth && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 animate-pulse">
              <p className="text-primary font-semibold mb-1">
                🌐 Browser Opened
              </p>
              <p className="text-sm text-muted-foreground">
                Please complete login in your browser, then return here.
                <br />
                This window will automatically continue once you&apos;re signed
                in.
              </p>
            </div>
          )}

          <div className="mb-8">
            <div className="inline-flex items-center justify-center rounded-2xl mb-4">
              <img src="./full-logo.png" alt="Collector Desktop" />
            </div>
          </div>
          <Button
            onClick={handleLoginClick}
            size="lg"
            className="w-full text-white text-lg py-6 gradient-primary hover:opacity-90 transition-opacity"
            disabled={isAwaitingAuth}
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            {isAwaitingAuth
              ? "Waiting for login..."
              : "Sign in with Web Browser"}
          </Button>

          <div className="mt-6 p-4 rounded-lg text-sm bg-muted text-muted-foreground">
            <p>
              Clicking this button will open your web browser where you can sign
              in securely. After signing in, you&apos;ll be redirected back to
              this app automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log("🏠 Rendering MainLayout");
  return (
    <div className="relative w-screen h-screen">
      <EnvironmentIndicator />
      <MainLayout />

      {/* ⭐ Mode Switching Overlay */}
      {isSwitchingMode && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl mx-auto mb-6 gradient-primary animate-pulse" />
            <p className="text-foreground text-xl font-semibold mb-2">
              Switching Mode...
            </p>
            <p className="text-muted-foreground text-sm">
              Preparing your workspace
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
