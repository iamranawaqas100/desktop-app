import { create } from "zustand";

export interface ExtractedItem {
  id: number;
  _id?: string; // MongoDB ID for AI items
  title: string;
  description: string;
  image: string;
  price: string;
  category?: string;
  url: string;
  timestamp: string;
  verified: boolean;

  // Collection & Source tracking
  collectionRestaurantId?: string; // ⭐ New: Links to collection restaurant
  sourceId?: string;
  sourceUrl?: string;

  // Pricing & Currency
  currency?: string;
  sizes?: any; // JSON: Array of size options with prices
  priceLabels?: any; // JSON: Custom price labels (S/M/L, etc.)

  // Categorization
  masterHeaderId?: string;
  masterHeaderName?: string;
  menuHeaderName?: string;

  // Verification & Workflow
  isManual?: boolean; // true if manually added, false if from AI
  aiItemId?: string; // ⭐ Link to AI item for verification workflow
  hasManualVersion?: boolean; // ⭐ NEW: Shows "little sign" (✏️) indicator
  manualItemId?: string; // ⭐ NEW: Link to manual item if verified

  // AI-specific fields (from MenuItemAI)
  confidence?: number; // AI confidence score (0.0 - 1.0)
  hasConflict?: boolean; // AI extracted differently than previous manual
  needsReview?: boolean; // Requires human review
  reviewNotes?: string; // Collector notes during review

  // Legacy fields (for backward compatibility)
  collectionId?: string;
  quarterId?: string;
}

export interface CollectionContext {
  restaurantId: string;
  restaurantName: string;
  collectionId: string;
  collectionName: string;
  quarterId?: string;
  quarterName?: string;
  sourceId: string;
  sourceUrl: string;
  hasAIData: boolean; // Whether AI data exists for this source
  collectionRestaurantId?: string; // ⭐ NEW: For QC API calls
}

interface ExtractionState {
  user: any | null; // ⭐ NEW: Global user state
  extractedData: ExtractedItem[];
  currentMode: "manual" | "template" | "verification";
  selectedField: string | null;
  isSelecting: boolean;
  currentItemId: number | null;
  highlightsVisible: boolean;
  collectionContext: CollectionContext | null;

  // Actions
  setUser: (user: any | null) => void;
  setExtractedData: (data: ExtractedItem[]) => void;
  addExtractedItem: (item: ExtractedItem) => void;
  updateExtractedItem: (id: number, updates: Partial<ExtractedItem>) => void;
  removeExtractedItem: (id: number) => void;
  setCurrentMode: (mode: "manual" | "template" | "verification") => void;
  setSelectedField: (field: string | null) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setCurrentItemId: (id: number | null) => void;
  setHighlightsVisible: (visible: boolean) => void;
  setCollectionContext: (context: CollectionContext | null) => void;
}

interface UrlState {
  webAppUrl: string;
  isLocalhost: boolean;
  toggleUrl: () => void;
  setWebAppUrl: (url: string) => void;
}

const QA_URL = "https://collector-ui.qa.datassential.com";
const LOCALHOST_URL = "http://localhost:3000";

// Load saved URL preference from localStorage
const getInitialUrl = (): string => {
  if (typeof window === "undefined") return QA_URL;

  const saved = localStorage.getItem("webAppUrl");
  // Handle both with and without trailing slash for backward compatibility
  if (saved) {
    const normalized = saved.replace(/\/+$/, ""); // Remove trailing slashes
    if (normalized === LOCALHOST_URL || normalized === QA_URL) {
      return normalized;
    }
  }
  return QA_URL; // Default to QA
};

export const useUrlStore = create<UrlState>((set, get) => ({
  webAppUrl: getInitialUrl(),
  isLocalhost: getInitialUrl() === LOCALHOST_URL,
  toggleUrl: () => {
    const current = get().webAppUrl;
    const normalizedCurrent = current.replace(/\/+$/, ""); // Remove trailing slashes
    const newUrl = normalizedCurrent === QA_URL ? LOCALHOST_URL : QA_URL;
    set({ webAppUrl: newUrl, isLocalhost: newUrl === LOCALHOST_URL });
    localStorage.setItem("webAppUrl", newUrl);

    // Update API client base URL
    import("./lib/api-client").then(({ apiClient }) => {
      apiClient.setBaseURL(newUrl);
    });

    console.log(
      `🔄 Switched to: ${newUrl === LOCALHOST_URL ? "Localhost" : "QA"}`
    );
  },
  setWebAppUrl: (url: string) => {
    set({ webAppUrl: url, isLocalhost: url === LOCALHOST_URL });
    localStorage.setItem("webAppUrl", url);

    // Update API client base URL
    import("./lib/api-client").then(({ apiClient }) => {
      apiClient.setBaseURL(url);
    });
  },
}));

export const useExtractionStore = create<ExtractionState>((set) => ({
  user: null,
  extractedData: [],
  currentMode: "manual",
  selectedField: null,
  isSelecting: false,
  currentItemId: null,
  highlightsVisible: false,
  collectionContext: null,

  setUser: (user) => set({ user }),
  setExtractedData: (data) => set({ extractedData: data }),

  addExtractedItem: (item) =>
    set((state) => ({
      extractedData: [...state.extractedData, item],
    })),

  updateExtractedItem: (id, updates) =>
    set((state) => ({
      extractedData: state.extractedData.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  removeExtractedItem: (id) =>
    set((state) => ({
      extractedData: state.extractedData.filter((item) => item.id !== id),
    })),

  setCurrentMode: (mode) => set({ currentMode: mode }),
  setSelectedField: (field) => set({ selectedField: field }),
  setIsSelecting: (isSelecting) => set({ isSelecting }),
  setCurrentItemId: (id) => set({ currentItemId: id }),
  setHighlightsVisible: (visible) => set({ highlightsVisible: visible }),
  setCollectionContext: (context) => set({ collectionContext: context }),
}));
