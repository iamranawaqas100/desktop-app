"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { X, ArrowLeft } from "lucide-react"
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

interface CollectionPeriodFormV2Props {
  mode: "create" | "edit"
  initialData?: {
    _id?: string
    name: string
    year: number
    restaurantListIds: number[]
    numberOfQuarters?: number
  }
  onSubmit: (data: { name: string; year: number; restaurantListIds: number[]; numberOfQuarters: number }) => Promise<void>
  onCancel: () => void
}

export function CollectionPeriodFormV2({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: CollectionPeriodFormV2Props) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    year: initialData?.year || new Date().getFullYear(),
    restaurantListIds: initialData?.restaurantListIds || [],
    numberOfQuarters: initialData?.numberOfQuarters || 4,
  })
  const [allRestaurantLists, setAllRestaurantLists] = useState<RestaurantList[]>([])
  const [loading, setLoading] = useState(false)
  
  // Use async action hook for submit
  const asyncAction = useAsyncAction()

  useEffect(() => {
    fetchRestaurantLists()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await asyncAction.execute(async () => {
      await onSubmit(formData)
    })
  }

  const toggleRestaurantList = (listId: number) => {
    setFormData((prev) => ({
      ...prev,
      restaurantListIds: prev.restaurantListIds.includes(listId)
        ? prev.restaurantListIds.filter((id) => id !== listId)
        : [...prev.restaurantListIds, listId],
    }))
  }

  const selectedLists = allRestaurantLists.filter((list) =>
    formData.restaurantListIds.includes(list._id)
  )

  const totalRestaurants = selectedLists.reduce((sum, list) => sum + list.restaurantCount, 0)

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.year > 0 &&
    formData.numberOfQuarters > 0 &&
    formData.restaurantListIds.length > 0

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
            disabled={asyncAction.isLoading}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#000000]" style={{ fontFamily: "Montserrat" }}>
              {mode === "create" ? "New Collection Period" : "Edit Collection Period"}
            </h1>
            <p className="text-sm text-[#6B7280] mt-1" style={{ fontFamily: "Montserrat" }}>
              {mode === "create"
                ? "Create a new collection period and select restaurant lists"
                : "Update collection period details"}
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
                Period Name *
              </Label>
              <Input
                id="name"
                placeholder="2025 Collection"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                style={{ fontFamily: "Montserrat" }}
                disabled={asyncAction.isLoading}
              />
            </div>

            {/* Year */}
            <div>
              <Label
                htmlFor="year"
                className="text-sm font-medium text-[#374151] mb-2 block"
                style={{ fontFamily: "Montserrat" }}
              >
                Year *
              </Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max="2100"
                placeholder="2025"
                value={formData.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) || 0 })
                }
                className="h-12 rounded-xl border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                style={{ fontFamily: "Montserrat" }}
                disabled={asyncAction.isLoading}
              />
            </div>

            {/* Number of Quarters */}
            <div>
              <Label
                htmlFor="quarters"
                className="text-sm font-medium text-[#374151] mb-2 block"
                style={{ fontFamily: "Montserrat" }}
              >
                Number of Quarters *
              </Label>
              <select
                id="quarters"
                value={formData.numberOfQuarters}
                onChange={(e) => setFormData({ ...formData, numberOfQuarters: parseInt(e.target.value) })}
                className="w-full h-12 px-4 rounded-xl border border-[#E5E7EB] focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
                style={{ fontFamily: "Montserrat" }}
                disabled={asyncAction.isLoading}
              >
                <option value={1}>1 Period - Full Year (Jan-Dec)</option>
                <option value={2}>2 Periods - Half-Yearly (6 months each)</option>
                <option value={3}>3 Periods - Tri-Annual (4 months each)</option>
                <option value={4}>4 Quarters - Quarterly (3 months each)</option>
                <option value={6}>6 Periods - Bi-Monthly (2 months each)</option>
                <option value={12}>12 Periods - Monthly (1 month each)</option>
              </select>
              <p className="text-xs text-[#6B7280] mt-2">
                Quarters will be automatically generated with dates divided equally across the year
              </p>
            </div>

            {/* Restaurant Lists Selection */}
            <div>
              <Label className="text-sm font-medium text-[#374151] mb-3 block" style={{ fontFamily: "Montserrat" }}>
                Select Restaurant Lists *
              </Label>

              {loading ? (
                <div className="text-center py-8 text-[#6B7280]">Loading restaurant lists...</div>
              ) : allRestaurantLists.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-[#E5E7EB] rounded-xl">
                  <p className="text-[#6B7280] mb-2">No restaurant lists found</p>
                  <p className="text-sm text-[#9CA3AF]">Create a restaurant list first</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allRestaurantLists.map((list) => (
                    <div
                      key={list._id}
                      onClick={() => !asyncAction.isLoading && toggleRestaurantList(list._id)}
                      className={`
                        p-4 border rounded-xl cursor-pointer transition-all
                        ${
                          formData.restaurantListIds.includes(list._id)
                            ? "border-[#00D2A1] bg-[#00D2A1]/5"
                            : "border-[#E5E7EB] hover:border-[#00D2A1]/50"
                        }
                        ${asyncAction.isLoading ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={formData.restaurantListIds.includes(list._id)}
                            onCheckedChange={() => !asyncAction.isLoading && toggleRestaurantList(list._id)}
                            className="mt-1"
                            disabled={asyncAction.isLoading}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                            {list.name}
                          </p>
                          {list.description && (
                            <p className="text-sm text-[#6B7280] mt-1">{list.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="bg-[#DBEAFE] text-[#1E40AF]">
                              {list.restaurantCount} restaurants
                            </Badge>
                            <Badge variant="outline">ID: {list._id}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Lists Summary */}
            {selectedLists.length > 0 && (
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-6">
                <h3 className="text-sm font-medium text-[#374151] mb-3" style={{ fontFamily: "Montserrat" }}>
                  Selected Lists Summary
                </h3>
                <div className="space-y-2">
                  {selectedLists.map((list) => (
                    <div
                      key={list._id}
                      className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{list.name}</p>
                        <p className="text-xs text-[#6B7280]">{list.restaurantCount} restaurants</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRestaurantList(list._id)}
                        disabled={asyncAction.isLoading}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#374151]">Total Restaurants:</span>
                    <span className="text-lg font-bold text-[#00D2A1]">{totalRestaurants}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={asyncAction.isLoading}
                className="h-12 px-8 rounded-xl"
                style={{ fontFamily: "Montserrat" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || asyncAction.isLoading}
                className="h-12 px-8 rounded-xl bg-[#00D2A1] hover:bg-[#00B88E] text-white"
                style={{ fontFamily: "Montserrat" }}
              >
                {asyncAction.isLoading ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create Collection Period" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

