"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { X, Check, Search, ArrowLeft } from "lucide-react"
import { Badge } from "../ui/badge"
import { Card } from "../ui/card"

interface Restaurant {
  _id: string
  restaurantId: string
  name: string | null
  address: string | null
}

interface CollectionPeriodFormProps {
  mode: "create" | "edit"
  initialData?: {
    _id?: string
    name: string
    restaurantIds: string[]
    numberOfQuarters?: number
  }
  onSubmit: (data: { name: string; restaurantIds: string[]; numberOfQuarters: number }) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function CollectionPeriodForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CollectionPeriodFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    restaurantIds: initialData?.restaurantIds || [],
    numberOfQuarters: initialData?.numberOfQuarters || 4,
  })
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/restaurants")
      const data = await res.json()
      if (data.success) {
        setAllRestaurants(data.restaurants || [])
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const toggleRestaurant = (restaurantId: string) => {
    setFormData((prev) => ({
      ...prev,
      restaurantIds: prev.restaurantIds.includes(restaurantId)
        ? prev.restaurantIds.filter((id) => id !== restaurantId)
        : [...prev.restaurantIds, restaurantId],
    }))
  }

  const removeRestaurant = (restaurantId: string) => {
    setFormData((prev) => ({
      ...prev,
      restaurantIds: prev.restaurantIds.filter((id) => id !== restaurantId),
    }))
  }

  const selectedRestaurants = allRestaurants.filter((r) =>
    formData.restaurantIds.includes(r._id)
  )

  const filteredRestaurants = allRestaurants.filter((r) => {
    const query = searchQuery.toLowerCase()
    return (
      (r.name?.toLowerCase().includes(query) ||
        r.restaurantId?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query)) &&
      !formData.restaurantIds.includes(r._id)
    )
  })

  const isFormValid = formData.name.trim() !== "" && formData.numberOfQuarters > 0

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 w-10 p-0 rounded-full"
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#000000]" style={{ fontFamily: "Montserrat" }}>
              {mode === "create" ? "New Collection Period" : "Edit Collection Period"}
            </h1>
            <p className="text-sm text-[#6B7280] mt-1" style={{ fontFamily: "Montserrat" }}>
              {mode === "create" ? "Create a new collection period and assign restaurants" : "Update collection period details"}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-8">
        <Card className="p-8 shadow-sm border border-[#E5E7EB]">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Period Name */}
          <div>
            <Label
              htmlFor="name"
              className="text-sm font-medium text-[#374151] mb-2 block"
              style={{ fontFamily: "Montserrat" }}
            >
              Period Name
            </Label>
            <Input
              id="name"
              placeholder="Canada Q3 2025"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
              style={{ fontFamily: "Montserrat" }}
              disabled={isSubmitting}
            />
          </div>

          {/* Number of Quarters */}
          <div>
            <Label
              htmlFor="quarters"
              className="text-sm font-medium text-[#374151] mb-2 block"
              style={{ fontFamily: "Montserrat" }}
            >
              Number of Quarters
            </Label>
            <Input
              id="quarters"
              type="number"
              min="1"
              max="12"
              placeholder="4"
              value={formData.numberOfQuarters}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, numberOfQuarters: parseInt(e.target.value) || 0 })
              }
              className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
              style={{ fontFamily: "Montserrat" }}
              disabled={isSubmitting}
            />
            <p className="text-xs text-[#6B7280] mt-1" style={{ fontFamily: "Montserrat" }}>
              Specify how many quarters to divide this collection period into
            </p>
          </div>

            {/* Restaurants Dropdown */}
            <div>
              <Label
                htmlFor="restaurants"
                className="text-sm font-medium text-[#374151] mb-2 block"
                style={{ fontFamily: "Montserrat" }}
              >
                Restaurants
              </Label>

              {/* Custom Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full h-12 px-4 pr-10 border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] bg-white hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1] transition-all text-left flex items-center justify-between"
                  style={{ fontFamily: "Montserrat" }}
                  disabled={isSubmitting}
                >
                  <span>
                    {formData.restaurantIds.length > 0
                      ? `${formData.restaurantIds.length} restaurant${formData.restaurantIds.length > 1 ? "s" : ""} selected`
                      : "Select Restaurants"}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path
                      stroke="#9CA3AF"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M6 8l4 4 4-4"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu - Fixed positioning to stay within modal */}
                {dropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setDropdownOpen(false)}
                    />
                    
                    <div className="absolute z-50 w-full mt-2 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden" style={{ maxHeight: "min(320px, 40vh)" }}>
                      {/* Search */}
                      <div className="p-3 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                          <input
                            type="text"
                            placeholder="Search restaurants..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                            style={{ fontFamily: "Montserrat" }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Restaurant List */}
                      <div className="overflow-y-auto" style={{ maxHeight: "min(256px, 32vh)" }}>
                      {loading ? (
                        <div className="p-8 text-center text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                          Loading restaurants...
                        </div>
                      ) : filteredRestaurants.length === 0 ? (
                        <div className="p-8 text-center text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                          {searchQuery ? "No restaurants found" : "All restaurants selected"}
                        </div>
                      ) : (
                        filteredRestaurants.map((restaurant) => (
                          <button
                            key={restaurant._id}
                            type="button"
                            onClick={() => toggleRestaurant(restaurant._id)}
                            className="w-full px-4 py-3 text-left hover:bg-[#F3F4F6] transition-colors border-b border-[#F3F4F6] last:border-b-0 flex items-start gap-3"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-5 h-5 border-2 border-[#D1D5DB] rounded flex items-center justify-center">
                                {formData.restaurantIds.includes(restaurant._id) && (
                                  <Check className="h-3 w-3 text-[#00D2A1]" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm font-medium text-[#111827] truncate"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {restaurant.name || "Unnamed Restaurant"}
                              </div>
                              <div
                                className="text-xs text-[#6B7280] truncate"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {restaurant.restaurantId || "N/A"} • {restaurant.address || "No address"}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Selected Restaurants */}
              {selectedRestaurants.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-[#374151]" style={{ fontFamily: "Montserrat" }}>
                    Selected Restaurants ({selectedRestaurants.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRestaurants.map((restaurant) => (
                      <Badge
                        key={restaurant._id}
                        className="bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] px-3 py-1.5 flex items-center gap-2 hover:bg-[#BAE6FD] transition-colors"
                        style={{ fontFamily: "Montserrat" }}
                      >
                        <span className="text-sm">{restaurant.name || "Unnamed Restaurant"}</span>
                        <button
                          type="button"
                          onClick={() => removeRestaurant(restaurant._id)}
                          className="hover:text-[#075985] transition-colors"
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E5E7EB] mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-6 py-2.5 h-11 rounded-xl border-[#E5E7EB] hover:bg-[#F9FAFB]"
                style={{ fontFamily: "Montserrat" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="bg-[#00D2A1] hover:bg-[#00B88D] text-white font-semibold px-8 py-2.5 h-11 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "Montserrat" }}
              >
                {isSubmitting ? "Saving..." : mode === "create" ? "Create Period" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

