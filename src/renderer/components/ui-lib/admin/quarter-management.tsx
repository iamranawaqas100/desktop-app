"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Checkbox } from "../ui/checkbox"
import { Badge } from "../ui/badge"
import { Card } from "../ui/card"
import { useAsyncActions } from "../../../lib/useAsyncAction"
import {
  ArrowRight,
  Search,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"

interface Quarter {
  _id: string
  name: string
  quarterNumber: number
  startDate: string
  endDate: string
  restaurantCount: number
  status: string
}

interface RestaurantWithCollection {
  _id: string
  collectionId: string
  restaurantId: string
  quarterId: string | null
  assignedTo: string | null
  status: "pending" | "assigned" | "in-progress" | "completed" | "verified"
  restaurant: {
    _id: string
    restaurantListId: number
    name: string
    address: string
  }
  quarter?: {
    _id: string
    name: string
  }
  collector?: {
    _id: string
    name: string
    email: string
  }
}

interface QuarterManagementProps {
  collectionId: string
  quarters: Quarter[]
  onBulkAssign: (restaurantIds: string[], quarterId: string) => Promise<void>
  onImportFromQuarter: (sourceQuarterId: string, targetQuarterId: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export function QuarterManagement({
  collectionId,
  quarters,
  onBulkAssign,
  onImportFromQuarter,
  onRefresh,
}: QuarterManagementProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string>("unallocated")
  const [restaurants, setRestaurants] = useState<RestaurantWithCollection[]>([])
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCollectorAssignDialog, setShowCollectorAssignDialog] = useState(false)
  const [targetQuarter, setTargetQuarter] = useState("")
  const [sourceQuarter, setSourceQuarter] = useState("")
  const [selectedCollector, setSelectedCollector] = useState("")
  const [collectors, setCollectors] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Use async actions hook for managing loading states
  const asyncActions = useAsyncActions<"bulkAssign" | "import" | "assignCollector">()

  useEffect(() => {
    fetchRestaurants()
  }, [selectedQuarter, collectionId])

  useEffect(() => {
    fetchCollectors()
  }, [])

  const fetchCollectors = async () => {
    try {
      const res = await fetch("/api/users?role=collector")
      const data = await res.json()
      if (data.success) {
        setCollectors(data.users || [])
      }
    } catch (error) {
      console.error("Error fetching collectors:", error)
    }
  }

  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      let url = `/api/collection-restaurants?collectionId=${collectionId}`
      
      if (selectedQuarter === "unallocated") {
        url += "&unallocated=true"
      } else if (selectedQuarter !== "all") {
        url += `&quarterId=${selectedQuarter}`
      }

      const res = await fetch(url)
      const data = await res.json()
      
      if (data.success) {
        setRestaurants(data.restaurants || [])
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredRestaurants.map((r) => r._id)
      setSelectedRestaurants(allIds)
    } else {
      setSelectedRestaurants([])
    }
  }

  const handleSelectRestaurant = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRestaurants([...selectedRestaurants, id])
    } else {
      setSelectedRestaurants(selectedRestaurants.filter((rid) => rid !== id))
    }
  }

  const handleBulkAssign = async () => {
    if (!targetQuarter || selectedRestaurants.length === 0) return

    await asyncActions.execute("bulkAssign", async () => {
      const restaurantIds = selectedRestaurants.map((id) => {
        const restaurant = restaurants.find((r) => r._id === id)
        return restaurant?.restaurantId || ""
      }).filter(Boolean)

      await onBulkAssign(restaurantIds, targetQuarter)
      setShowBulkAssignDialog(false)
      setSelectedRestaurants([])
      setTargetQuarter("")
      await fetchRestaurants()
      await onRefresh()
    })
  }

  const handleImportFromQuarter = async () => {
    if (!sourceQuarter || !targetQuarter) return

    await asyncActions.execute("import", async () => {
      await onImportFromQuarter(sourceQuarter, targetQuarter)
      setShowImportDialog(false)
      setSourceQuarter("")
      setTargetQuarter("")
      await fetchRestaurants()
      await onRefresh()
    })
  }

  const handleCollectorAssign = async () => {
    if (!selectedCollector || selectedRestaurants.length === 0) return

    await asyncActions.execute("assignCollector", async () => {
      const res = await fetch("/api/collection-restaurants/assign-collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantIds: selectedRestaurants,
          collectorId: selectedCollector,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to assign collector")
      }

      setShowCollectorAssignDialog(false)
      setSelectedCollector("")
      setSelectedRestaurants([])
      await fetchRestaurants()
      await onRefresh()
    })
  }

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || r.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "assigned":
        return "bg-yellow-100 text-yellow-800"
      case "verified":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "in-progress":
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Quarter Tabs */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setSelectedQuarter("unallocated")
              setSelectedRestaurants([])
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${
                selectedQuarter === "unallocated"
                  ? "bg-[#00D2A1] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            Unallocated ({restaurants.length})
          </button>
          <button
            onClick={() => {
              setSelectedQuarter("all")
              setSelectedRestaurants([])
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${
                selectedQuarter === "all"
                  ? "bg-[#00D2A1] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            All Restaurants
          </button>
          {quarters.map((quarter) => (
            <button
              key={quarter._id}
              onClick={() => {
                setSelectedQuarter(quarter._id)
                setSelectedRestaurants([])
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${
                  selectedQuarter === quarter._id
                    ? "bg-[#00D2A1] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              {quarter.name} ({quarter.restaurantCount})
            </button>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl border-[#E5E7EB]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-[180px] h-12 rounded-xl border border-[#E5E7EB] px-3"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="verified">Verified</option>
        </select>

        {selectedRestaurants.length > 0 && (
          <>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              {selectedRestaurants.length} selected
            </Badge>
            
            {/* Show "Assign to Quarter" only in unallocated/all views */}
            {(selectedQuarter === "unallocated" || selectedQuarter === "all") && (
              <Button
                onClick={() => setShowBulkAssignDialog(true)}
                className="h-12 px-6 rounded-xl bg-[#00D2A1] hover:bg-[#00B88E]"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Assign to Quarter
              </Button>
            )}
            
            {/* Show "Assign to Collector" only in specific quarter views */}
            {selectedQuarter !== "unallocated" && selectedQuarter !== "all" && (
              <Button
                onClick={() => setShowCollectorAssignDialog(true)}
                className="h-12 px-6 rounded-xl bg-[#00B7B7] hover:bg-[#009999]"
              >
                <Users className="h-5 w-5 mr-2" />
                Assign to Collector
              </Button>
            )}
          </>
        )}

        {selectedQuarter !== "unallocated" && selectedQuarter !== "all" && (
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="h-12 px-6 rounded-xl"
          >
            <Upload className="h-5 w-5 mr-2" />
            Import from Quarter
          </Button>
        )}
      </div>

      {/* Restaurants List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading restaurants...</div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No restaurants found</p>
            <p className="text-sm text-gray-400 mt-2">
              {selectedQuarter === "unallocated"
                ? "All restaurants have been assigned to quarters"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <Checkbox
                      checked={
                        selectedRestaurants.length === filteredRestaurants.length &&
                        filteredRestaurants.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Restaurant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Address
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Quarter
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Assigned To
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedRestaurants.includes(item._id)}
                        onCheckedChange={(checked) =>
                          handleSelectRestaurant(item._id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{item.restaurant.name}</p>
                      <p className="text-xs text-gray-500">List ID: {item.restaurant.restaurantListId}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.restaurant.address}
                    </td>
                    <td className="px-6 py-4">
                      {item.quarter ? (
                        <Badge variant="outline">{item.quarter.name}</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100">
                          Unallocated
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.collector ? (
                        <div>
                          <p className="font-medium">{item.collector.name}</p>
                          <p className="text-xs text-gray-500">{item.collector.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Quarter</DialogTitle>
            <DialogDescription>
              Select a quarter to assign {selectedRestaurants.length} selected restaurant(s)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select
              value={targetQuarter}
              onChange={(e) => setTargetQuarter(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#E5E7EB] px-3"
            >
              <option value="">Select a quarter...</option>
              {quarters.map((quarter) => (
                <option key={quarter._id} value={quarter._id}>
                  {quarter.name} ({quarter.restaurantCount} restaurants)
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkAssignDialog(false)}
              disabled={asyncActions.isLoading("bulkAssign")}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={!targetQuarter || asyncActions.isLoading("bulkAssign")}
            >
              {asyncActions.isLoading("bulkAssign") ? "Assigning..." : "Assign Restaurants"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Quarter Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from Previous Quarter</DialogTitle>
            <DialogDescription>
              Copy all restaurants from one quarter to another. Status will be reset to pending.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Source Quarter</label>
              <select
                value={sourceQuarter}
                onChange={(e) => setSourceQuarter(e.target.value)}
                className="w-full h-12 rounded-xl border border-[#E5E7EB] px-3"
              >
                <option value="">Select source quarter...</option>
                {quarters
                  .filter((q) => q._id !== selectedQuarter)
                  .map((quarter) => (
                    <option key={quarter._id} value={quarter._id}>
                      {quarter.name} ({quarter.restaurantCount} restaurants)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Target Quarter</label>
              <Input value={quarters.find((q) => q._id === selectedQuarter)?.name || ""} disabled />
              <p className="text-xs text-gray-500 mt-2">
                Current quarter: {quarters.find((q) => q._id === selectedQuarter)?.name}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowImportDialog(false)}
              disabled={asyncActions.isLoading("import")}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportFromQuarter} 
              disabled={!sourceQuarter || asyncActions.isLoading("import")}
            >
              {asyncActions.isLoading("import") ? "Importing..." : "Import Restaurants"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Collector Dialog */}
      <Dialog open={showCollectorAssignDialog} onOpenChange={setShowCollectorAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Collector</DialogTitle>
            <DialogDescription>
              Select a collector to assign {selectedRestaurants.length} selected restaurant(s)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Select Collector</label>
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#E5E7EB] px-3"
            >
              <option value="">Select a collector...</option>
              {collectors.map((collector) => (
                <option key={collector._id} value={collector._id}>
                  {collector.name} ({collector.email})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCollectorAssignDialog(false)}
              disabled={asyncActions.isLoading("assignCollector")}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCollectorAssign} 
              disabled={!selectedCollector || asyncActions.isLoading("assignCollector")}
            >
              {asyncActions.isLoading("assignCollector") ? "Assigning..." : "Assign Collector"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

