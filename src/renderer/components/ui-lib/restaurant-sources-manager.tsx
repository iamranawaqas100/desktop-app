"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card } from "./ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { Plus, FileText } from "lucide-react"

// Local type definition
interface RestaurantSource {
  _id: string
  url: string
  type: "website" | "pdf" | "excel" | "csv" | "api" | "other"
  name: string
  description?: string
  addedBy: string
  addedAt: Date | string
  updatedBy?: string
  updatedAt?: Date | string
}

interface RestaurantSourcesManagerProps {
  restaurantId: string
  restaurantName: string
  isCollector?: boolean
  sources: RestaurantSource[]
  loading?: boolean
  onFetchSources: () => Promise<void>
  onAddSource: (source: Omit<RestaurantSource, "_id" | "addedBy" | "addedAt" | "updatedBy" | "updatedAt">) => Promise<void>
  onDeleteSource: (sourceId: string) => Promise<void>
  onShowToast?: (toast: { title: string; description: string; variant: "success" | "error" | "info" }) => void
  onRunAICollection?: (sourceId: string) => Promise<void>
}

const triggerDesktopExtraction = (sourceUrl: string, restaurantId: string, sourceId: string) => {
  const extractUrl = `dataextractor://extract?url=${encodeURIComponent(sourceUrl)}&restaurantId=${encodeURIComponent(restaurantId)}&sourceId=${encodeURIComponent(sourceId)}`
  console.log("[v0] 🚀 Opening Data Extractor Desktop App")
  console.log("[v0] 📍 Source URL:", sourceUrl)
  console.log("[v0] 🔗 Protocol URL:", extractUrl)

  // Trigger the desktop app via deep linking
  window.location.href = extractUrl
}

export function RestaurantSourcesManager({
  restaurantId,
  restaurantName,
  isCollector = false,
  sources,
  loading = false,
  onFetchSources,
  onAddSource,
  onDeleteSource,
  onShowToast,
  onRunAICollection,
}: RestaurantSourcesManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteSourceItem, setDeleteSourceItem] = useState<RestaurantSource | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    url: "",
    type: (isCollector ? "pdf" : "website") as RestaurantSource["type"],
    name: "",
    description: "",
  })

  useEffect(() => {
    onFetchSources()
  }, [restaurantId])

  const handleAddSource = async () => {
    if (!formData.url || !formData.type) return

    // Check if collector is trying to upload a file
    if (isCollector) {
      setSubmitting(true)
      // Show "under development" message
      if (onShowToast) {
        onShowToast({
          title: "Feature Under Development",
          description: "File upload functionality for collectors is currently under development. Please check back soon!",
          variant: "info",
        })
      }
      setSubmitting(false)
      setShowAddDialog(false)
      setFormData({ 
        url: "", 
        type: "pdf" as RestaurantSource["type"], 
        name: "", 
        description: "" 
      })
      return
    }

    setSubmitting(true)
    try {
      await onAddSource({
        url: formData.url,
        type: formData.type,
        name: formData.name,
        description: formData.description,
      })
      setShowAddDialog(false)
      setFormData({ 
        url: "", 
        type: "website" as RestaurantSource["type"], 
        name: "", 
        description: "" 
      })
    } catch (error) {
      console.error("Error adding source:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSource = async () => {
    if (!deleteSourceItem) return

    setSubmitting(true)
    try {
      await onDeleteSource(deleteSourceItem._id)
      setDeleteSourceItem(null)
    } catch (error) {
      console.error("Error deleting source:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunManualCollection = (source: RestaurantSource) => {
    console.log("[v0] 🎯 Triggering manual collection for source:", source.name)
    triggerDesktopExtraction(source.url, restaurantId, source._id)
  }

  const handleRunAICollection = async (source: RestaurantSource) => {
    console.log("[v0] 🤖 Starting AI collection for source:", source.name)

    if (onRunAICollection) {
      // Use the provided handler
      try {
        await onRunAICollection(source._id)
      } catch (error) {
        console.error("Error running AI collection:", error)
      }
      return
    }

    // Fallback to old API if handler not provided
    // Show loading state
    const button = document.activeElement as HTMLButtonElement
    const originalText = button?.textContent
    if (button) {
      button.textContent = "Processing..."
      button.disabled = true
    }

    try {
      const response = await fetch("/api/ai-collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId,
          sourceUrl: source.url,
          sourceType: source.type,
          sourceName: source.name,
          sourceId: source._id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("[v0] ✅ AI Collection completed:", data)

        // Open desktop app with the source and restaurant context
        const collectUrl = `dataextractor://collect?restaurant_id=${encodeURIComponent(restaurantId)}&source_id=${encodeURIComponent(source._id)}&source_url=${encodeURIComponent(source.url)}&restaurant_name=${encodeURIComponent(restaurantName)}`
        console.log("[v0] 🚀 Opening desktop app:", collectUrl)

        // Trigger desktop app (this will open silently without alerts)
        window.location.href = collectUrl

        // Refresh sources to see updated status
        onFetchSources()
      } else {
        console.error("[v0] ❌ AI Collection error:", data)
        alert(`❌ AI Collection failed: ${data.error}\n\n${data.details || ""}`)
      }
    } catch (error) {
      console.error("[v0] ❌ AI Collection error:", error)
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      // Restore button text
      if (button && originalText) {
        button.textContent = originalText
        button.disabled = false
      }
    }
  }


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ fontFamily: "Montserrat" }}>
            Collection Sources
          </h3>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
            URLs and files for menu data collection
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#00B7B7] hover:bg-[#009999] gap-2"
          style={{ fontFamily: "Montserrat" }}
        >
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B7B7]" />
          <p className="mt-4 text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
            Loading sources...
          </p>
        </div>
      ) : sources.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-semibold mb-2" style={{ fontFamily: "Montserrat" }}>
            No Sources Added Yet
          </h4>
          <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "Montserrat" }}>
            Add sources to collect menu data for this restaurant
          </p>
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="outline"
            className="gap-2"
            style={{ fontFamily: "Montserrat" }}
          >
            <Plus className="h-4 w-4" />
            Add First Source
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sources.map((source) => {
            return (
              <div key={source._id} className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                <div className="grid gap-4 items-center" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
                  {/* Source Info */}
                  <div className="flex items-center gap-2">
                    {source.type === "pdf" ? (
                      <div
                        className="flex items-center gap-2 text-sm text-[#737373]"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <FileText className="h-4 w-4" />
                        <span>{source.name || source.url}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                        {source.url}
                      </div>
                    )}
                  </div>


                  {/* Status/Action Button - Dynamic based on source status */}
                  <div>
                    {/* TODO: Add status tracking to source model */}
                    <Button
                      className="bg-[#00D2A1] hover:bg-[#00b890] text-white h-10 px-5 rounded-lg font-medium"
                      onClick={() => handleRunAICollection(source)}
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Run AI Collection
                    </Button>
                  </div>

                  {/* Run Manual Collection Button - Triggers Desktop App */}
                  <Button
                    variant="outline"
                    className="gap-2 bg-white border-[#E5E5E5] hover:border-[#00D2A1] h-10 px-5 rounded-lg font-medium text-[#737373]"
                    onClick={() => handleRunManualCollection(source)}
                    style={{ fontFamily: "Montserrat" }}
                  >
                    Run Manual Collection
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="opacity-60"
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat" }}>Add Collection Source</DialogTitle>
            <DialogDescription style={{ fontFamily: "Montserrat" }}>
              {isCollector 
                ? `Upload a file for menu data collection from ${restaurantName}`
                : `Add a new source for menu data collection from ${restaurantName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-type" style={{ fontFamily: "Montserrat" }}>
                Source Type *
              </Label>
              <select
                id="source-type"
                value={formData.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, type: e.target.value as RestaurantSource["type"] })
                }
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                {!isCollector && <option value="website">Website</option>}
                <option value="pdf">PDF Document</option>
                <option value="excel">Excel File</option>
                <option value="csv">CSV File</option>
                {!isCollector && <option value="api">API Endpoint</option>}
                {!isCollector && <option value="other">Other</option>}
              </select>
            </div>

            {!isCollector && (
              <div className="space-y-2">
                <Label htmlFor="source-url" style={{ fontFamily: "Montserrat" }}>
                  URL / File Path *
                </Label>
                <Input
                  id="source-url"
                  value={formData.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/menu or /path/to/file.pdf"
                  style={{ fontFamily: "Montserrat" }}
                />
              </div>
            )}

            {isCollector && (
              <div className="space-y-2">
                <Label htmlFor="source-file" style={{ fontFamily: "Montserrat" }}>
                  Upload File *
                </Label>
                <Input
                  id="source-file"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFormData({ ...formData, url: file.name, name: file.name })
                    }
                  }}
                  className="cursor-pointer"
                  style={{ fontFamily: "Montserrat" }}
                />
                <p className="text-xs text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                  Accepted formats: PDF, Excel, CSV
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="source-name" style={{ fontFamily: "Montserrat" }}>
                Source Name
              </Label>
              <Input
                id="source-name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Main Menu Website"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-description" style={{ fontFamily: "Montserrat" }}>
                Description (Optional)
              </Label>
              <Input
                id="source-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional notes about this source"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={submitting}
              style={{ fontFamily: "Montserrat" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={submitting || !formData.url || !formData.type}
              className="bg-[#00B7B7] hover:bg-[#009999]"
              style={{ fontFamily: "Montserrat" }}
            >
              {submitting ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSourceItem} onOpenChange={() => setDeleteSourceItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Delete Source</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Are you sure you want to delete "{deleteSourceItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSource}
              className="bg-red-600 hover:bg-red-700"
              style={{ fontFamily: "Montserrat" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
