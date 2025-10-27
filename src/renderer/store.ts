import { create } from 'zustand'

export interface ExtractedItem {
  id: number
  _id?: string // MongoDB ID for AI items
  title: string
  description: string
  image: string
  price: string
  category?: string
  url: string
  timestamp: string
  verified: boolean
  // Additional MongoDB fields
  collectionId?: string
  quarterId?: string
  sourceId?: string
  currency?: string
  masterHeaderId?: string
  masterHeaderName?: string
  menuHeaderName?: string
  // Manual collection specific
  isManual?: boolean // true if manually added, false if from AI
  aiItemId?: string // Link to AI item if this is a verification
}

export interface CollectionContext {
  restaurantId: string
  restaurantName: string
  collectionId: string
  collectionName: string
  quarterId?: string
  quarterName?: string
  sourceId: string
  sourceUrl: string
  hasAIData: boolean // Whether AI data exists for this source
}

interface ExtractionState {
  extractedData: ExtractedItem[]
  currentMode: 'manual' | 'template' | 'verification'
  selectedField: string | null
  isSelecting: boolean
  currentItemId: number | null
  highlightsVisible: boolean
  collectionContext: CollectionContext | null
  
  // Actions
  setExtractedData: (data: ExtractedItem[]) => void
  addExtractedItem: (item: ExtractedItem) => void
  updateExtractedItem: (id: number, updates: Partial<ExtractedItem>) => void
  removeExtractedItem: (id: number) => void
  setCurrentMode: (mode: 'manual' | 'template' | 'verification') => void
  setSelectedField: (field: string | null) => void
  setIsSelecting: (isSelecting: boolean) => void
  setCurrentItemId: (id: number | null) => void
  setHighlightsVisible: (visible: boolean) => void
  setCollectionContext: (context: CollectionContext | null) => void
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  extractedData: [],
  currentMode: 'manual',
  selectedField: null,
  isSelecting: false,
  currentItemId: null,
  highlightsVisible: false,
  collectionContext: null,

  setExtractedData: (data) => set({ extractedData: data }),
  
  addExtractedItem: (item) => set((state) => ({
    extractedData: [...state.extractedData, item]
  })),
  
  updateExtractedItem: (id, updates) => set((state) => ({
    extractedData: state.extractedData.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  })),
  
  removeExtractedItem: (id) => set((state) => ({
    extractedData: state.extractedData.filter(item => item.id !== id)
  })),
  
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setSelectedField: (field) => set({ selectedField: field }),
  setIsSelecting: (isSelecting) => set({ isSelecting }),
  setCurrentItemId: (id) => set({ currentItemId: id }),
  setHighlightsVisible: (visible) => set({ highlightsVisible: visible }),
  setCollectionContext: (context) => set({ collectionContext: context }),
}))
