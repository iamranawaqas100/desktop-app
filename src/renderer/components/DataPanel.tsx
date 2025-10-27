"use client"

import { useState } from "react"
import { useExtractionStore, type ExtractedItem } from "../store"
import { Button } from "./ui-lib/ui/button"
import { Input } from "./ui-lib/ui/input"
import { Trash2, Edit2, Save, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

const WEB_APP_URL = 'http://localhost:3000'

export default function DataPanel() {
  const {
    extractedData,
    currentMode,
    selectedField,
    currentItemId,
    collectionContext,
    setCurrentMode,
    setSelectedField,
    setCurrentItemId,
    addExtractedItem,
    updateExtractedItem,
    removeExtractedItem,
    setExtractedData,
  } = useExtractionStore()

  const [showExportModal, setShowExportModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [exportFormat, setExportFormat] = useState("json")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<ExtractedItem>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleStartEdit = (item: ExtractedItem) => {
    setEditingItemId(item.id)
    setEditFormData({
      title: item.title,
      description: item.description,
      image: item.image,
      price: item.price,
      category: item.category,
    })
  }

  const handleSaveEdit = async (id: number) => {
    await window.electronAPI.updateExtractedData(id, editFormData)
    updateExtractedItem(id, editFormData)
    setEditingItemId(null)
    setEditFormData({})
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditFormData({})
  }

  const handleAddItem = async () => {
    const newItem = {
      title: "",
      description: "",
      image: "",
      price: "",
      category: "",
      url: "",
      timestamp: new Date().toISOString(),
      verified: false,
    }

    const savedItem = await window.electronAPI.saveExtractedData(newItem)
    addExtractedItem(savedItem)
    setCurrentItemId(savedItem.id)
  }

  const handleFieldSelect = (field: string) => {
    setSelectedField(selectedField === field ? null : field)
    const webview = document.querySelector("webview")
    if (webview) {
      ;(webview as any).executeJavaScript(`
        window.postMessage({ command: 'START_SELECTION', field: '${field}' }, '*');
      `)
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (confirm("Delete this item?")) {
      await window.electronAPI.deleteExtractedData(id)
      removeExtractedItem(id)
    }
  }

  const handleVerifyItem = async (item: ExtractedItem) => {
    // Toggle verification locally
    await window.electronAPI.updateExtractedData(item.id, { verified: !item.verified })
    updateExtractedItem(item.id, { verified: !item.verified })
  }

  const handleCompleteCollection = async () => {
    if (!collectionContext) {
      alert('❌ No collection context found. Please start from the web app.')
      return
    }

    const hasUnverified = extractedData.some(item => !item.verified)
    
    if (hasUnverified) {
      const unverifiedCount = extractedData.filter(item => !item.verified).length
      const shouldContinue = confirm(
        `⚠️ Warning: ${unverifiedCount} items are not verified yet.\n\nIn verification mode, all AI items must be verified before completing.\n\nDo you want to continue anyway?`
      )
      
      if (!shouldContinue) {
        return
      }
    }

    setShowCompleteModal(true)
  }

  const handleSaveToAPI = async () => {
    if (!collectionContext) {
      alert('❌ No collection context found')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      // Get auth token
      const authData = localStorage.getItem('authData')
      if (!authData) {
        throw new Error('Not authenticated')
      }

      const { sessionToken } = JSON.parse(authData)

      // Prepare items for saving
      const itemsToSave = extractedData.map(item => ({
        restaurantId: collectionContext.restaurantId,
        collectionId: collectionContext.collectionId,
        quarterId: collectionContext.quarterId || null,
        sourceId: collectionContext.sourceId,
        aiItemId: item._id || null, // Link to AI item if exists
        name: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        currency: item.currency || 'USD',
        masterHeaderId: item.masterHeaderId || null,
        masterHeaderName: item.masterHeaderName || '',
        menuHeaderName: item.menuHeaderName || item.category || '',
        verified: item.verified,
      }))

      console.log(`💾 Saving ${itemsToSave.length} items to API...`)

      // Save using electron API
      const result = await window.electronAPI.saveManualMenuItems({
        items: itemsToSave,
        authToken: sessionToken,
        apiUrl: WEB_APP_URL,
      })

      if (result.success) {
        alert(`✅ Successfully saved ${result.count} items to the database!`)
        
        // Clear local data after successful save
        await Promise.all(extractedData.map(item => 
          window.electronAPI.deleteExtractedData(item.id)
        ))
        setExtractedData([])
        setShowCompleteModal(false)
        
        // Notify user of completion
        console.log('✅ Collection completed and saved!')
      } else {
        throw new Error(`Failed to save ${result.errors?.length || 0} items`)
      }
    } catch (error) {
      console.error('❌ Error saving to API:', error)
      setSaveError(error instanceof Error ? error.message : 'Unknown error')
      alert(`❌ Failed to save items: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearAll = async () => {
    if (confirm("Clear all data? This cannot be undone.")) {
      await Promise.all(extractedData.map((item) => window.electronAPI.deleteExtractedData(item.id)))
      setExtractedData([])
      setCurrentItemId(null)
    }
  }

  const handleExport = async () => {
    const result = await window.electronAPI.exportData(exportFormat)
    setShowExportModal(false)

    if (result.success) {
      alert(`Exported ${result.count} items successfully!`)
    }
  }

  const isItemEmpty = (item: ExtractedItem) => {
    return !item.title && !item.description && !item.image && !item.price
  }

  return (
    <aside className="w-96 flex flex-col border-l border-[#E5E5E5] bg-white">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-[#000000]" style={{ fontFamily: "Montserrat" }}>
            Master Header
          </h3>
          <span
            className="px-3 py-1 rounded-full text-sm font-bold bg-[#00D2A1] text-white"
            style={{ fontFamily: "Montserrat" }}
          >
            {extractedData.length}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={handleAddItem}
              className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-10"
              style={{ fontFamily: "Montserrat" }}
            >
              Add Template
            </Button>
            <Button
              onClick={handleAddItem}
              className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-10"
              style={{ fontFamily: "Montserrat" }}
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#000000]" style={{ fontFamily: "Montserrat" }}>
                Master Header
              </span>
              <div className="w-10 h-6 bg-[#00D2A1] rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#000000]" style={{ fontFamily: "Montserrat" }}>
                Menu Headers
              </span>
              <div className="w-10 h-6 bg-[#00D2A1] rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Selector */}
      {currentItemId && (
        <div className="p-4 border-b border-[#E5E5E5] bg-[#F7F7F7]">
          <div className="text-sm font-medium mb-2 text-[#000000]" style={{ fontFamily: "Montserrat" }}>
            Select Field to Extract:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["title", "description", "image", "price"].map((field) => (
              <button
                key={field}
                onClick={() => handleFieldSelect(field)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors border ${
                  selectedField === field
                    ? "bg-[#00D2A1] text-white border-[#00D2A1]"
                    : "bg-white border-[#E5E5E5] hover:bg-[#F7F7F7] text-[#000000]"
                }`}
                style={{ fontFamily: "Montserrat" }}
              >
                {field}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Data List */}
      <div className="flex-1 overflow-y-auto p-4">
        {extractedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#737373]">
            <div className="text-5xl mb-4">📊</div>
            <div className="text-lg font-medium mb-2" style={{ fontFamily: "Montserrat" }}>
              No data extracted yet
            </div>
            <div className="text-sm" style={{ fontFamily: "Montserrat" }}>
              Click "Add Item" to create your first item
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {extractedData.map((item, index) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-colors ${
                  item.id === currentItemId
                    ? "bg-[#E6FAF5] border-[#00D2A1]"
                    : "bg-white border-[#E5E5E5] hover:bg-[#F7F7F7]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-[#000000]" style={{ fontFamily: "Montserrat" }}>
                    {index + 1}. {item.title || "Untitled Item"}
                  </span>
                  <div className="flex gap-1">
                    {item.verified && (
                      <span
                        className="text-xs px-2 py-0.5 rounded bg-[#00D2A1]/20 text-[#00D2A1]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        ✓ Verified
                      </span>
                    )}
                    {item.id === currentItemId && (
                      <span
                        className="text-xs px-2 py-0.5 rounded bg-[#00D2A1]/20 text-[#00D2A1]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        🎯 Active
                      </span>
                    )}
                  </div>
                </div>

                {editingItemId === item.id ? (
                  // Edit Mode
                  <div className="space-y-2 mb-3">
                    <Input
                      placeholder="Title"
                      value={editFormData.title || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="text-sm h-9 rounded-lg border-[#E5E5E5]"
                      style={{ fontFamily: "Montserrat" }}
                    />
                    <Input
                      placeholder="Description"
                      value={editFormData.description || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="text-sm h-9 rounded-lg border-[#E5E5E5]"
                      style={{ fontFamily: "Montserrat" }}
                    />
                    <Input
                      placeholder="Image URL"
                      value={editFormData.image || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                      className="text-sm h-9 rounded-lg border-[#E5E5E5]"
                      style={{ fontFamily: "Montserrat" }}
                    />
                    <Input
                      placeholder="Price"
                      value={editFormData.price || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      className="text-sm h-9 rounded-lg border-[#E5E5E5]"
                      style={{ fontFamily: "Montserrat" }}
                    />
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-1 text-sm mb-3 text-[#737373]">
                    <div style={{ fontFamily: "Montserrat" }}>
                      <span className="font-medium text-[#000000]">Title:</span>{" "}
                      <span className={item.title ? "text-[#000000]" : ""}>{item.title || "No title"}</span>
                    </div>
                    <div style={{ fontFamily: "Montserrat" }}>
                      <span className="font-medium text-[#000000]">Desc:</span>{" "}
                      <span className={item.description ? "text-[#000000]" : ""}>
                        {item.description ? item.description.substring(0, 40) + "..." : "No description"}
                      </span>
                    </div>
                    {item.image && (
                      <div style={{ fontFamily: "Montserrat" }}>
                        <span className="font-medium text-[#000000]">Image:</span>{" "}
                        <a
                          href={item.image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00D2A1] hover:underline text-xs"
                        >
                          View
                        </a>
                      </div>
                    )}
                    <div style={{ fontFamily: "Montserrat" }}>
                      <span className="font-medium text-[#000000]">Price:</span>{" "}
                      <span className={item.price ? "text-[#000000]" : ""}>{item.price || "No price"}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingItemId === item.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors bg-[#00D2A1] hover:bg-[#00B890] text-white font-medium"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <Save size={12} className="inline mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors bg-[#F7F7F7] hover:bg-[#E5E5E5] text-[#000000]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <X size={12} className="inline mr-1" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVerifyItem(item)}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                          item.verified
                            ? "bg-[#00D2A1]/20 text-[#00D2A1] hover:bg-[#00D2A1]/30"
                            : "bg-[#FFA500]/20 text-[#FFA500] hover:bg-[#FFA500]/30"
                        }`}
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <CheckCircle2 size={12} className="inline mr-1" />
                        {item.verified ? 'Verified' : 'Verify'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors bg-[#F7F7F7] hover:bg-[#E5E5E5] text-[#000000]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <Edit2 size={12} className="inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-2 py-1.5 text-xs rounded-lg transition-colors bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#E5E5E5] space-y-2">
        {/* Status Info */}
        {collectionContext && (
          <div className="text-xs text-[#737373] mb-2 p-2 bg-[#F7F7F7] rounded-lg" style={{ fontFamily: "Montserrat" }}>
            <div><span className="font-medium text-[#000000]">Restaurant:</span> {collectionContext.restaurantName}</div>
            <div><span className="font-medium text-[#000000]">Mode:</span> {collectionContext.hasAIData ? 'Verification' : 'Manual Collection'}</div>
            {extractedData.length > 0 && (
              <div className="mt-1">
                <span className="font-medium text-[#000000]">Verified:</span>{' '}
                {extractedData.filter(item => item.verified).length} / {extractedData.length}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleCompleteCollection}
          className="w-full bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-lg h-12"
          disabled={extractedData.length === 0}
          style={{ fontFamily: "Montserrat", fontWeight: 600 }}
        >
          Complete Collection
        </Button>
        
        {/* Old export button for backward compatibility */}
        <Button
          onClick={() => setShowExportModal(true)}
          variant="outline"
          className="w-full rounded-lg h-10"
          disabled={extractedData.length === 0}
          style={{ fontFamily: "Montserrat" }}
        >
          Export Data (Local)
        </Button>
      </div>

      {/* Complete Collection Modal */}
      {showCompleteModal && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg p-6 w-full max-w-md border bg-white border-[#E5E5E5] shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-[#000000]" style={{ fontFamily: "Montserrat" }}>
              Complete Collection
            </h3>

            <div className="space-y-3 mb-6">
              <div className="p-4 bg-[#F7F7F7] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#000000]" style={{ fontFamily: "Montserrat" }}>Total Items</span>
                  <span className="text-lg font-bold text-[#00D2A1]" style={{ fontFamily: "Montserrat" }}>{extractedData.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#000000]" style={{ fontFamily: "Montserrat" }}>Verified Items</span>
                  <span className="text-lg font-bold text-[#00D2A1]" style={{ fontFamily: "Montserrat" }}>
                    {extractedData.filter(item => item.verified).length}
                  </span>
                </div>
              </div>

              {collectionContext?.hasAIData && (
                <div className="p-3 bg-[#FFA500]/10 rounded-lg border border-[#FFA500]/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-[#FFA500] mt-0.5" />
                    <p className="text-xs text-[#000000]" style={{ fontFamily: "Montserrat" }}>
                      <strong>Verification Mode:</strong> All AI-extracted items should be verified before completing.
                    </p>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-[#DC2626]/10 rounded-lg border border-[#DC2626]/30">
                  <p className="text-xs text-[#DC2626]" style={{ fontFamily: "Montserrat" }}>
                    {saveError}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowCompleteModal(false)
                  setSaveError(null)
                }}
                variant="outline"
                className="flex-1"
                disabled={isSaving}
                style={{ fontFamily: "Montserrat" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveToAPI}
                className="flex-1 bg-[#00D2A1] hover:bg-[#00B890] text-white"
                disabled={isSaving}
                style={{ fontFamily: "Montserrat" }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save to Database'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg p-6 w-full max-w-sm border bg-card border-border shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Export Data</h3>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors hover:bg-muted border-border">
                <input
                  type="radio"
                  name="exportFormat"
                  value="json"
                  checked={exportFormat === "json"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="accent-primary"
                />
                <div>
                  <div className="font-medium">JSON Format</div>
                  <div className="text-sm text-muted-foreground">Structured data with all fields</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors hover:bg-muted border-border">
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="accent-primary"
                />
                <div>
                  <div className="font-medium">CSV Format</div>
                  <div className="text-sm text-muted-foreground">Spreadsheet compatible format</div>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowExportModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              {/* Export button - using gradient class */}
              <Button onClick={handleExport} className="flex-1 gradient-primary text-white">
                Export
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
