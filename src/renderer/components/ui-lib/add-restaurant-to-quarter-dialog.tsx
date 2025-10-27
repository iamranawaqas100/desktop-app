"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Checkbox } from "./ui/checkbox"

interface Restaurant {
  _id: string
  restaurantId: string
  name: string
  address: string
  collectionPeriodId?: string | null
  quarterId?: string | null
}

interface AddRestaurantToQuarterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionPeriodId: string
  quarterId: string
  quarterName: string
  onSuccess?: () => void
}

export function AddRestaurantToQuarterDialog({
  open,
  onOpenChange,
  collectionPeriodId,
  quarterId,
  quarterName,
  onSuccess,
}: AddRestaurantToQuarterDialogProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch unassigned restaurants
  useEffect(() => {
    if (open) {
      fetchUnassignedRestaurants()
    }
  }, [open])

  const fetchUnassignedRestaurants = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/restaurants?unassigned=true")
      const data = await res.json()
      if (data.success) {
        setRestaurants(data.restaurants)
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
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

  const handleSubmit = async () => {
    if (selectedRestaurants.size === 0) return

    setSubmitting(true)
    try {
      const promises = Array.from(selectedRestaurants).map((restaurantId) =>
        fetch("/api/restaurants/assign-to-quarter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            collectionPeriodId,
            quarterId,
          }),
        })
      )

      await Promise.all(promises)
      setSelectedRestaurants(new Set())
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error assigning restaurants:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.restaurantId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Restaurants to {quarterName}</DialogTitle>
          <DialogDescription>
            Select existing restaurants to add to this quarter
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div>
            <Label htmlFor="search">Search Restaurants</Label>
            <Input
              id="search"
              placeholder="Search by name, ID, or address..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading restaurants...</div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No unassigned restaurants found
              </div>
            ) : (
              <div className="divide-y">
                {filteredRestaurants.map((restaurant) => (
                  <div
                    key={restaurant._id}
                    className="flex items-start gap-3 p-4 hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleRestaurantSelection(restaurant._id)}
                  >
                    <Checkbox
                      checked={selectedRestaurants.has(restaurant._id)}
                      onCheckedChange={() => toggleRestaurantSelection(restaurant._id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-sm text-muted-foreground">{restaurant.address}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {restaurant.restaurantId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedRestaurants.size} restaurant(s) selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedRestaurants.size === 0 || submitting}
          >
            {submitting ? "Adding..." : `Add ${selectedRestaurants.size} Restaurant(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
