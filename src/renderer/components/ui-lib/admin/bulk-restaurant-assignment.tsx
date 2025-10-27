"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Card } from "../ui/card"
import { Checkbox } from "../ui/checkbox"
import { Search, Plus, Trash2, UserPlus, UserMinus } from "lucide-react"
import { Badge } from "../ui/badge"
import { Pagination, usePagination } from "../ui/pagination"

interface Restaurant {
  _id: string
  restaurantId: string | null
  name: string | null
  address: string | null
  status: string
  assignedTo: string | null
  collectionPeriodId: string | null
  quarterId: string | null
  collector?: {
    _id: string
    name: string
    email: string
  } | null
  collectionPeriod?: {
    _id: string
    name: string
  } | null
}

interface Collector {
  _id: string
  name: string
  email: string
  totalAssigned: number
}

interface BulkRestaurantAssignmentProps {
  collectionPeriodId: string
  onSuccess?: () => void
}

export function BulkRestaurantAssignment({ collectionPeriodId, onSuccess }: BulkRestaurantAssignmentProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set())
  const [selectedCollector, setSelectedCollector] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [collectionPeriodId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch ALL restaurants
      const restaurantsRes = await fetch(`/api/restaurants`)
      const restaurantsData = await restaurantsRes.json()

      // Fetch collectors
      const collectorsRes = await fetch("/api/users/collectors")
      const collectorsData = await collectorsRes.json()

      if (restaurantsData.success) {
        setRestaurants(restaurantsData.restaurants)
      }
      if (collectorsData.success) {
        setCollectors(collectorsData.collectors)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRestaurantSelection = (restaurantId: string) => {
    const newSelected = new Set(selectedRestaurants)
    if (newSelected.has(restaurantId)) {
      newSelected.delete(restaurantId)
    } else {
      newSelected.add(restaurantId)
    }
    setSelectedRestaurants(newSelected)
  }

  const selectAll = () => {
    setSelectedRestaurants(new Set(filteredRestaurants.map((r) => r._id)))
  }

  const deselectAll = () => {
    setSelectedRestaurants(new Set())
  }

  // Bulk Add to Collection
  const handleBulkAddToCollection = async () => {
    if (selectedRestaurants.size === 0) return
    
    setSubmitting(true)
    try {
      const res = await fetch("/api/restaurants/bulk-add-to-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantIds: Array.from(selectedRestaurants),
          collectionPeriodId: collectionPeriodId,
        }),
      })

      if (res.ok) {
        setSelectedRestaurants(new Set())
        fetchData()
        onSuccess?.()
      }
    } catch (error) {
      console.error("Error adding to collection:", error)
    } finally {
      setSubmitting(false)
    }
  }

  // Bulk Remove from Collection
  const handleBulkRemoveFromCollection = async () => {
    if (selectedRestaurants.size === 0) return
    
    setSubmitting(true)
    try {
      const res = await fetch("/api/restaurants/bulk-remove-from-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantIds: Array.from(selectedRestaurants),
          collectionPeriodId: collectionPeriodId,
        }),
      })

      if (res.ok) {
        setSelectedRestaurants(new Set())
        fetchData()
        onSuccess?.()
      }
    } catch (error) {
      console.error("Error removing from collection:", error)
    } finally {
      setSubmitting(false)
    }
  }

  // Bulk Assign Collector
  const handleBulkAssignCollector = async () => {
    if (!selectedCollector || selectedRestaurants.size === 0) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/restaurants/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantIds: Array.from(selectedRestaurants),
          collectorId: selectedCollector,
          collectionPeriodId: collectionPeriodId,
        }),
      })

      if (res.ok) {
        setSelectedRestaurants(new Set())
        setSelectedCollector("")
        fetchData()
        onSuccess?.()
      }
    } catch (error) {
      console.error("Error assigning collector:", error)
    } finally {
      setSubmitting(false)
    }
  }

  // Bulk Unassign Collector
  const handleBulkUnassignCollector = async () => {
    if (selectedRestaurants.size === 0) return
    
    setSubmitting(true)
    try {
      const res = await fetch("/api/restaurants/bulk-unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantIds: Array.from(selectedRestaurants),
        }),
      })

      if (res.ok) {
        setSelectedRestaurants(new Set())
        fetchData()
        onSuccess?.()
      }
    } catch (error) {
      console.error("Error unassigning collector:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRestaurants = restaurants.filter(
    (r) => {
      const query = searchQuery?.toLowerCase() || ""
      return (
        r.name?.toLowerCase().includes(query) ||
        r.restaurantId?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query)
      )
    }
  )

  // Use pagination hook with URL params
  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems: paginatedRestaurants,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
  } = usePagination(filteredRestaurants, 25, true) // Enable URL params

  const inCollectionCount = restaurants.filter((r) => r.collectionPeriodId === collectionPeriodId).length
  const selectedCollectorData = collectors.find((c) => c._id === selectedCollector)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
            Total Restaurants
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: "Montserrat" }}>
            {restaurants.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
            In This Collection
          </div>
          <div className="text-2xl font-bold text-[#00B7B7]" style={{ fontFamily: "Montserrat" }}>
            {inCollectionCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
            Selected
          </div>
          <div className="text-2xl font-bold text-orange-500" style={{ fontFamily: "Montserrat" }}>
            {selectedRestaurants.size}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Restaurants */}
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "Montserrat" }}>
                All Restaurants
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} style={{ fontFamily: "Montserrat" }}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} style={{ fontFamily: "Montserrat" }}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>

            <div className="border rounded-lg max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B7B7]" />
                </div>
              ) : filteredRestaurants.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                  No restaurants found
                </div>
              ) : (
                <div className="divide-y">
                  {paginatedRestaurants.map((restaurant) => {
                    const isInCollection = restaurant.collectionPeriodId === collectionPeriodId
                    return (
                      <div
                        key={restaurant._id}
                        className={`flex items-start gap-3 p-3 hover:bg-accent/50 cursor-pointer border-l-4 transition-colors ${
                          isInCollection 
                            ? "border-l-[#00B7B7] bg-[#00B7B7]/5" 
                            : "border-l-transparent"
                        }`}
                        onClick={() => toggleRestaurantSelection(restaurant._id)}
                      >
                        <Checkbox
                          checked={selectedRestaurants.has(restaurant._id)}
                          onCheckedChange={() => toggleRestaurantSelection(restaurant._id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium truncate" style={{ fontFamily: "Montserrat" }}>
                              {restaurant.name || "Unnamed Restaurant"}
                            </div>
                            {isInCollection && (
                              <Badge variant="outline" className="text-xs bg-[#00B7B7]/10 text-[#00B7B7] border-[#00B7B7]">
                                In Collection
                              </Badge>
                            )}
                            {restaurant.collector && (
                              <Badge variant="outline" className="text-xs">
                                {restaurant.collector.name}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate" style={{ fontFamily: "Montserrat" }}>
                            {restaurant.address || "No address"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Montserrat" }}>
                            ID: {restaurant.restaurantId || "N/A"}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredRestaurants.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                showItemsPerPage={true}
                itemsPerPageOptions={[10, 25, 50, 100]}
                useUrlParams={true}
              />
            )}
          </div>
        </Card>

        {/* Right Panel: Bulk Actions */}
        <Card className="p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: "Montserrat" }}>
              Bulk Actions
            </h3>

            {/* Collection Actions */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                Collection
              </div>
              <Button
                onClick={handleBulkAddToCollection}
                disabled={submitting || selectedRestaurants.size === 0}
                className="w-full gap-2"
                style={{ fontFamily: "Montserrat" }}
              >
                <Plus className="h-4 w-4" />
                Add to Collection ({selectedRestaurants.size})
              </Button>
              <Button
                onClick={handleBulkRemoveFromCollection}
                disabled={submitting || selectedRestaurants.size === 0}
                variant="outline"
                className="w-full gap-2"
                style={{ fontFamily: "Montserrat" }}
              >
                <Trash2 className="h-4 w-4" />
                Remove from Collection ({selectedRestaurants.size})
              </Button>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                  Collector
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm" style={{ fontFamily: "Montserrat" }}>
                    Select Collector
                  </label>
                  <select
                    value={selectedCollector}
                    onChange={(e) => setSelectedCollector(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    <option value="">Choose collector...</option>
                    {collectors.map((collector) => (
                      <option key={collector._id} value={collector._id}>
                        {collector.name} ({collector.totalAssigned} assigned)
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleBulkAssignCollector}
                  disabled={submitting || !selectedCollector || selectedRestaurants.size === 0}
                  className="w-full gap-2 bg-[#00B7B7] hover:bg-[#00B7B7]/90"
                  style={{ fontFamily: "Montserrat" }}
                >
                  <UserPlus className="h-4 w-4" />
                  Assign Collector ({selectedRestaurants.size})
                </Button>

                <Button
                  onClick={handleBulkUnassignCollector}
                  disabled={submitting || selectedRestaurants.size === 0}
                  variant="outline"
                  className="w-full gap-2"
                  style={{ fontFamily: "Montserrat" }}
                >
                  <UserMinus className="h-4 w-4" />
                  Unassign Collector ({selectedRestaurants.size})
                </Button>
              </div>
            </div>

            {selectedCollectorData && (
              <div className="border rounded-lg p-4 bg-accent/50">
                <div className="text-sm font-medium" style={{ fontFamily: "Montserrat" }}>
                  {selectedCollectorData.name}
                </div>
                <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                  {selectedCollectorData.email}
                </div>
                <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Montserrat" }}>
                  Currently: {selectedCollectorData.totalAssigned} restaurants
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
