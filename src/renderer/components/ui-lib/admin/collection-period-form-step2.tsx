"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Badge } from "../ui/badge"
import { Card } from "../ui/card"
import { Checkbox } from "../ui/checkbox"
import { useAsyncAction } from "../../../lib/useAsyncAction"

interface RestaurantList {
  _id: number
  name: string
  description?: string
  restaurantCount: number
}

interface Restaurant {
  _id: string
  name: string
  address: string
  restaurantListId: number
}

interface CollectionPeriodFormStep2Props {
  mode: "create" | "edit"
  initialData?: {
    _id?: string
    name: string
    restaurantListId: number
    restaurantIds?: string[]
  }
  onSubmit: (data: { 
    name: string
    restaurantListId: number
    restaurantIds?: string[]
    startDate?: Date
    endDate?: Date
    description?: string
  }) => Promise<void>
  onCancel: () => void
}

export function CollectionPeriodFormStep2({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: CollectionPeriodFormStep2Props) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    restaurantListId: initialData?.restaurantListId || 0,
    restaurantIds: initialData?.restaurantIds || [],
    description: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  })
  const [allRestaurantLists, setAllRestaurantLists] = useState<RestaurantList[]>([])
  const [availableRestaurants, setAvailableRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRestaurants, setLoadingRestaurants] = useState(false)
  
  // Use async action hook for submit
  const asyncAction = useAsyncAction()

  useEffect(() => {
    fetchRestaurantLists()
  }, [])

  // Fetch restaurants when restaurant list is selected
  useEffect(() => {
    if (step === 2 && formData.restaurantListId > 0) {
      fetchRestaurantsFromList()
    }
  }, [step, formData.restaurantListId])

  const fetchRestaurantLists = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/restaurant-lists")
      const data = await res.json()
      if (data.success) {
        setAllRestaurantLists(data.lists || [])
      }
    } catch (error) {
      console.error("Error fetching restaurant lists:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRestaurantsFromList = async () => {
    setLoadingRestaurants(true)
    try {
      const res = await fetch(`/api/restaurants?restaurantListId=${formData.restaurantListId}`)
      const data = await res.json()
      if (data.success) {
        setAvailableRestaurants(data.restaurants || [])
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    } finally {
      setLoadingRestaurants(false)
    }
  }

  const handleNext = () => {
    if (isStep1Valid) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await asyncAction.execute(async () => {
      await onSubmit(formData)
    })
  }

  const toggleRestaurant = (restaurantId: string) => {
    setFormData((prev) => ({
      ...prev,
      restaurantIds: prev.restaurantIds.includes(restaurantId)
        ? prev.restaurantIds.filter((id) => id !== restaurantId)
        : [...prev.restaurantIds, restaurantId],
    }))
  }

  const selectAllRestaurants = () => {
    setFormData((prev) => ({
      ...prev,
      restaurantIds: availableRestaurants.map((r) => r._id),
    }))
  }

  const deselectAllRestaurants = () => {
    setFormData((prev) => ({
      ...prev,
      restaurantIds: [],
    }))
  }

  const selectedList = allRestaurantLists.find((list) => list._id === formData.restaurantListId)

  const isStep1Valid =
    formData.name.trim() !== "" &&
    formData.restaurantListId > 0

  const isStep2Valid = formData.restaurantIds.length > 0

  const selectedRestaurants = availableRestaurants.filter((r) =>
    formData.restaurantIds.includes(r._id)
  )

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? onCancel : handleBack}
            className="h-10 w-10 p-0 rounded-full"
            disabled={asyncAction.isLoading}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#000000]" style={{ fontFamily: "Montserrat" }}>
              {mode === "create" ? "New Collection Period" : "Edit Collection Period"}
            </h1>
            <p className="text-sm text-[#6B7280] mt-1" style={{ fontFamily: "Montserrat" }}>
              {step === 1
                ? "Step 1: Enter collection name and select restaurant list"
                : "Step 2: Select restaurants to include in this collection"}
            </p>
          </div>
          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step >= 1 ? "bg-[#00D2A1] text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className="w-12 h-0.5 bg-gray-200"></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step >= 2 ? "bg-[#00D2A1] text-white" : "bg-gray-200 text-gray-500"
            }`}>
              2
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-8">
        <Card className="p-8 shadow-sm border border-[#E5E7EB]">
          {step === 1 ? (
            /* STEP 1: Collection Info + Restaurant List */
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
              {/* Collection Name */}
              <div>
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-[#374151] mb-2 block"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Collection Name *
                </Label>
                <Input
                  id="name"
                  placeholder="Q1 2025 Collection"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                  style={{ fontFamily: "Montserrat" }}
                />
                <p className="text-xs text-[#6B7280] mt-2">
                  Example: "2024-Q1", "Summer 2025", "2024-HI"
                </p>
              </div>

              {/* Description */}
              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-[#374151] mb-2 block"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  placeholder="Brief description of this collection period"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                  style={{ fontFamily: "Montserrat" }}
                />
              </div>

              {/* Optional Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="startDate"
                    className="text-sm font-medium text-[#374151] mb-2 block"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    Start Date (Optional)
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value) : undefined })
                    }
                    className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                    style={{ fontFamily: "Montserrat" }}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="endDate"
                    className="text-sm font-medium text-[#374151] mb-2 block"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    End Date (Optional)
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })
                    }
                    className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                    style={{ fontFamily: "Montserrat" }}
                  />
                </div>
              </div>

              {/* Restaurant List Selection (SINGLE) */}
              <div>
                <Label className="text-sm font-medium text-[#374151] mb-3 block" style={{ fontFamily: "Montserrat" }}>
                  Select Restaurant List *
                </Label>

                {loading ? (
                  <div className="text-center py-8 text-[#6B7280]">Loading restaurant lists...</div>
                ) : allRestaurantLists.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-[#E5E7EB] rounded-xl">
                    <p className="text-[#6B7280] mb-2">No restaurant lists found</p>
                    <p className="text-sm text-[#9CA3AF]">Create a restaurant list first</p>
                  </div>
                ) : (
                  <select
                    value={formData.restaurantListId}
                    onChange={(e) => setFormData({ ...formData, restaurantListId: parseInt(e.target.value), restaurantIds: [] })}
                    className="w-full h-12 px-4 rounded-xl border border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1] text-base"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    <option value={0}>Choose a restaurant list...</option>
                    {allRestaurantLists.map((list) => (
                      <option key={list._id} value={list._id}>
                        {list.name} ({list.restaurantCount} restaurants)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected List Summary */}
              {selectedList && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-6">
                  <h3 className="text-sm font-medium text-[#374151] mb-3" style={{ fontFamily: "Montserrat" }}>
                    Selected Restaurant List
                  </h3>
                  <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{selectedList.name}</p>
                      {selectedList.description && (
                        <p className="text-xs text-[#6B7280] mt-1">{selectedList.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-[#DBEAFE] text-[#1E40AF]">
                      {selectedList.restaurantCount} restaurants
                    </Badge>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="h-12 px-8 rounded-xl"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isStep1Valid}
                  className="h-12 px-8 rounded-xl bg-[#00D2A1] hover:bg-[#00B88E] text-white flex items-center gap-2"
                  style={{ fontFamily: "Montserrat" }}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            /* STEP 2: Select Restaurants */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#000000]" style={{ fontFamily: "Montserrat" }}>
                    Select Restaurants
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Choose which restaurants to include in "{formData.name}"
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllRestaurants}
                    disabled={loadingRestaurants}
                    className="h-9"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllRestaurants}
                    disabled={loadingRestaurants}
                    className="h-9"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {loadingRestaurants ? (
                <div className="text-center py-12 text-[#6B7280]">
                  Loading restaurants...
                </div>
              ) : availableRestaurants.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] rounded-xl">
                  <p className="text-[#6B7280] mb-2">No restaurants found in selected list</p>
                  <p className="text-sm text-[#9CA3AF]">Go back and select a different list</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableRestaurants.map((restaurant) => (
                    <div
                      key={restaurant._id}
                      onClick={() => !asyncAction.isLoading && toggleRestaurant(restaurant._id)}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-all
                        ${
                          formData.restaurantIds.includes(restaurant._id)
                            ? "border-[#00D2A1] bg-[#00D2A1]/5"
                            : "border-[#E5E7EB] hover:border-[#00D2A1]/50"
                        }
                        ${asyncAction.isLoading ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={formData.restaurantIds.includes(restaurant._id)}
                            onCheckedChange={() => !asyncAction.isLoading && toggleRestaurant(restaurant._id)}
                            disabled={asyncAction.isLoading}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#111827] truncate">{restaurant.name}</p>
                          <p className="text-xs text-[#6B7280] truncate">{restaurant.address}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Restaurants Summary */}
              {selectedRestaurants.length > 0 && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-[#374151]" style={{ fontFamily: "Montserrat" }}>
                        Restaurants Selected
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-1">
                        These restaurants will be added to the collection (unallocated)
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-[#00D2A1]">{selectedRestaurants.length}</span>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={asyncAction.isLoading}
                  className="h-12 px-8 rounded-xl flex items-center gap-2"
                  style={{ fontFamily: "Montserrat" }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!isStep2Valid || asyncAction.isLoading}
                  className="h-12 px-8 rounded-xl bg-[#00D2A1] hover:bg-[#00B88E] text-white"
                  style={{ fontFamily: "Montserrat" }}
                >
                  {asyncAction.isLoading 
                    ? (mode === "create" ? "Creating..." : "Saving...") 
                    : mode === "create" ? "Create Collection Period" : "Save Changes"
                  }
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
