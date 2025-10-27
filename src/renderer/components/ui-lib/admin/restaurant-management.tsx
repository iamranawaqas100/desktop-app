"use client"

import * as React from "react"
import { Search, ChevronDown, X, FileText, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface Restaurant {
  _id: string
  restaurantId: string
  name: string
  address: string
  collectionPeriod: string
  assignedTo: string | null
  status: "pending" | "in-progress" | "completed"
  createdAt: string
  sourcesCount?: number
}

interface Source {
  _id: string
  url: string
  type: "website" | "pdf" | "excel" | "csv" | "api" | "other"
  name: string
  description?: string
}

interface RestaurantManagementProps {
  onAddRestaurant: (restaurant: Omit<Restaurant, "_id" | "restaurantId" | "createdAt">) => Promise<void>
  onUpdateRestaurant: (id: string, restaurant: Partial<Restaurant>) => Promise<void>
  onDeleteRestaurant: (id: string) => Promise<void>
  onFetchSources: (restaurantId: string) => Promise<Source[]>
  onAddSource: (restaurantId: string, source: Omit<Source, "_id">) => Promise<void>
  onDeleteSource: (restaurantId: string, sourceId: string) => Promise<void>
  onViewRestaurant: (restaurantId: string) => void // Navigate to detail page
  onSearch?: (query: string) => Promise<void> // Optional search handler
  restaurants: Restaurant[]
  collectors: Array<{ _id: string; name: string }>
  collectionPeriods: string[]
  isLoading?: boolean
  isSearching?: boolean // New loading state for search
  initialSources?: Record<string, Source[]> // Optional prefetched sources
}

export function RestaurantManagement({
  onAddRestaurant,
  onUpdateRestaurant,
  onDeleteRestaurant,
  onFetchSources,
  onAddSource,
  onDeleteSource,
  onViewRestaurant,
  onSearch,
  restaurants,
  collectors,
  collectionPeriods,
  isLoading,
  isSearching,
  initialSources = {},
}: RestaurantManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showAddSourceDialog, setShowAddSourceDialog] = React.useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = React.useState<Restaurant | null>(null)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [restaurantSources, setRestaurantSources] = React.useState<Record<string, Source[]>>(initialSources)
  const [loadingSources, setLoadingSources] = React.useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = React.useState(false)

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Update sources when initialSources changes (prefetch completes)
  React.useEffect(() => {
    setRestaurantSources(prev => ({ ...prev, ...initialSources }))
  }, [initialSources])

  // Trigger search when debounced value changes
  React.useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, onSearch])
  
  const [formData, setFormData] = React.useState({
    name: "",
    address: "",
    collectionPeriod: "",
    assignedTo: "",
    status: "pending" as "pending" | "in-progress" | "completed",
  })

  const [sourceFormData, setSourceFormData] = React.useState({
    url: "",
    type: "website" as Source["type"],
    name: "",
    description: "",
  })

  // Use filtered restaurants prop directly - no local filtering
  const filteredRestaurants = restaurants

  const toggleRow = async (restaurantId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(restaurantId)) {
      newExpanded.delete(restaurantId)
    } else {
      newExpanded.add(restaurantId)
      // Load sources if not already loaded
      if (!restaurantSources[restaurantId]) {
        setLoadingSources(new Set(loadingSources).add(restaurantId))
        try {
          const sources = await onFetchSources(restaurantId)
          setRestaurantSources({ ...restaurantSources, [restaurantId]: sources })
        } catch (error) {
          console.error("Error fetching sources:", error)
        } finally {
          const newLoading = new Set(loadingSources)
          newLoading.delete(restaurantId)
          setLoadingSources(newLoading)
        }
      }
    }
    setExpandedRows(newExpanded)
  }

  const handleAdd = async () => {
    await onAddRestaurant(formData)
    setShowAddDialog(false)
    setFormData({ name: "", address: "", collectionPeriod: "", assignedTo: "", status: "pending" })
  }

  const handleEdit = async () => {
    if (selectedRestaurant) {
      await onUpdateRestaurant(selectedRestaurant._id, formData)
      setShowEditDialog(false)
      setSelectedRestaurant(null)
      setFormData({ name: "", address: "", collectionPeriod: "", assignedTo: "", status: "pending" })
    }
  }

  const handleDelete = async () => {
    if (selectedRestaurant) {
      await onDeleteRestaurant(selectedRestaurant._id)
      setShowDeleteDialog(false)
      setSelectedRestaurant(null)
    }
  }

  const handleAddSource = async () => {
    if (!selectedRestaurant) return
    setSubmitting(true)
    try {
      await onAddSource(selectedRestaurant._id, sourceFormData)
      // Refresh sources
      const sources = await onFetchSources(selectedRestaurant._id)
      setRestaurantSources({ ...restaurantSources, [selectedRestaurant._id]: sources })
      setShowAddSourceDialog(false)
      setSourceFormData({ url: "", type: "website", name: "", description: "" })
    } catch (error) {
      console.error("Error adding source:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSource = async (restaurantId: string, sourceId: string) => {
    try {
      await onDeleteSource(restaurantId, sourceId)
      // Refresh sources
      const sources = await onFetchSources(restaurantId)
      setRestaurantSources({ ...restaurantSources, [restaurantId]: sources })
    } catch (error) {
      console.error("Error deleting source:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373] animate-spin" />
          ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
          )}
          <Input
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            style={{ fontFamily: "Montserrat" }}
            disabled={isLoading}
          />
          {searchTerm && !isSearching && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 rounded-full p-1 transition-colors"
              title="Clear search"
            >
              <X className="h-3 w-3 text-[#737373]" />
            </button>
          )}
        </div>
        {/* <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#00D2A1] hover:bg-[#00b890]"
          style={{ fontFamily: "Montserrat" }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Restaurant
        </Button> */}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[#E5E5E5]">
              <tr>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Restaurant ID
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Restaurant Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Restaurant Code
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Sources Attached
                </th>
                <th
                  className="px-6 py-4 text-right text-sm font-semibold text-foreground"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                    No restaurants found
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((restaurant) => {
                  const isExpanded = expandedRows.has(restaurant._id)
                  const sources = restaurantSources[restaurant._id] || []
                  const isLoadingSources = loadingSources.has(restaurant._id)
                  // Show initial count or loaded count
                  const sourcesCount = sources.length > 0 ? sources.length : (restaurant.sourcesCount || 0)

                  return (
                    <React.Fragment key={restaurant._id}>
                      <tr className="border-b border-[#E5E5E5] hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-foreground" style={{ fontFamily: "Montserrat" }}>
                          {restaurant._id}
                    </td>
                        <td className="px-6 py-4 text-sm text-foreground font-medium" style={{ fontFamily: "Montserrat" }}>
                      {restaurant.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                          {restaurant.restaurantId}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                          {sourcesCount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => onViewRestaurant(restaurant._id)}
                              className="bg-[#00D2A1] hover:bg-[#00b890] h-10 px-5"
                              style={{ fontFamily: "Montserrat" }}
                            >
                              Add Source
                            </Button>
                        <button
                              onClick={() => toggleRow(restaurant._id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                        >
                              <ChevronDown 
                                className={`h-4 w-4 text-[#737373] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              />
                        </button>
                      </div>
                    </td>
                  </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-gray-50 px-6 py-0 border-b border-[#E5E5E5]">
                            <div className="overflow-hidden animate-in slide-in-from-top-2 duration-200">
                              <div className="py-4">
                                {isLoadingSources ? (
                                  <div className="text-center py-4 text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                                    Loading sources...
                                  </div>
                                ) : sources.length === 0 ? (
                                  <div className="text-center py-4 text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                                    No sources added yet
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {sources.map((source) => (
                                      <div
                                        key={source._id}
                                        className="bg-white rounded-lg border border-[#E5E5E5] p-4 flex items-center justify-between"
                                      >
                                        <div className="flex items-center gap-3">
                                          {source.type === "pdf" || source.type === "excel" || source.type === "csv" ? (
                                            <FileText className="h-5 w-5 text-[#00B7B7]" />
                                          ) : (
                                            <div className="h-5 w-5 rounded-full bg-[#00B7B7] flex items-center justify-center">
                                              <span className="text-white text-xs font-bold">S</span>
                                            </div>
                                          )}
                                          <div>
                                            <p className="text-sm font-medium text-foreground" style={{ fontFamily: "Montserrat" }}>
                                              {source.name || source.url}
                                            </p>
                                            <p className="text-xs text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                                              {source.url}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteSource(restaurant._id, source._id)}
                                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                          <X className="h-4 w-4 text-[#FF4D4F]" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Restaurant Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Add New Restaurant</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Create a new restaurant entry in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" style={{ fontFamily: "Montserrat" }}>
                Restaurant Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter restaurant name"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" style={{ fontFamily: "Montserrat" }}>
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period" style={{ fontFamily: "Montserrat" }}>
                Collection Period
              </Label>
              <select
                id="period"
                value={formData.collectionPeriod}
                onChange={(e) => setFormData({ ...formData, collectionPeriod: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="">Select period</option>
                {collectionPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collector" style={{ fontFamily: "Montserrat" }}>
                Assign to Collector
              </Label>
              <select
                id="collector"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="">Unassigned</option>
                {collectors.map((collector) => (
                  <option key={collector._id} value={collector._id}>
                    {collector.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdd}
              className="bg-[#00D2A1] hover:bg-[#00b890]"
              style={{ fontFamily: "Montserrat" }}
            >
              Add Restaurant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Restaurant Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Edit Restaurant</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Update restaurant information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" style={{ fontFamily: "Montserrat" }}>
                Restaurant Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address" style={{ fontFamily: "Montserrat" }}>
                Address
              </Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-period" style={{ fontFamily: "Montserrat" }}>
                Collection Period
              </Label>
              <select
                id="edit-period"
                value={formData.collectionPeriod}
                onChange={(e) => setFormData({ ...formData, collectionPeriod: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                {collectionPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-collector" style={{ fontFamily: "Montserrat" }}>
                Assign to Collector
              </Label>
              <select
                id="edit-collector"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="">Unassigned</option>
                {collectors.map((collector) => (
                  <option key={collector._id} value={collector._id}>
                    {collector.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status" style={{ fontFamily: "Montserrat" }}>
                Status
              </Label>
              <select
                id="edit-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as "pending" | "in-progress" | "completed" })
                }
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEdit}
              className="bg-[#00D2A1] hover:bg-[#00b890]"
              style={{ fontFamily: "Montserrat" }}
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Restaurant Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Are you sure you want to delete {selectedRestaurant?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#FF4D4F] hover:bg-[#ff3333]"
              style={{ fontFamily: "Montserrat" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Source Dialog */}
      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat" }}>Add Source</DialogTitle>
            <DialogDescription style={{ fontFamily: "Montserrat" }}>
              Add a new source for {selectedRestaurant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-type" style={{ fontFamily: "Montserrat" }}>
                Source Type
              </Label>
              <select
                id="source-type"
                value={sourceFormData.type}
                onChange={(e) => setSourceFormData({ ...sourceFormData, type: e.target.value as Source["type"] })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="website">Website</option>
                <option value="pdf">PDF Document</option>
                <option value="excel">Excel File</option>
                <option value="csv">CSV File</option>
                <option value="api">API Endpoint</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-url" style={{ fontFamily: "Montserrat" }}>
                URL / File Path
              </Label>
              <Input
                id="source-url"
                value={sourceFormData.url}
                onChange={(e) => setSourceFormData({ ...sourceFormData, url: e.target.value })}
                placeholder="https://example.com/menu"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-name" style={{ fontFamily: "Montserrat" }}>
                Source Name
              </Label>
              <Input
                id="source-name"
                value={sourceFormData.name}
                onChange={(e) => setSourceFormData({ ...sourceFormData, name: e.target.value })}
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
                value={sourceFormData.description}
                onChange={(e) => setSourceFormData({ ...sourceFormData, description: e.target.value })}
                placeholder="Additional notes"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddSourceDialog(false)}
              disabled={submitting}
              style={{ fontFamily: "Montserrat" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={submitting || !sourceFormData.url}
              className="bg-[#00D2A1] hover:bg-[#00b890]"
              style={{ fontFamily: "Montserrat" }}
            >
              {submitting ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
