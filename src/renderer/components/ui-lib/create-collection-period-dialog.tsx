"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { MultiSelect, type MultiSelectOption } from "./ui/multi-select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"

interface CreateCollectionPeriodDialogProps {
  onSubmit: (data: {
    name: string
    restaurantIds: string[]
  }) => Promise<void>
  isSubmitting?: boolean
}

export function CreateCollectionPeriodDialog({ onSubmit, isSubmitting = false }: CreateCollectionPeriodDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    restaurantIds: [] as string[],
  })
  const [restaurants, setRestaurants] = useState<MultiSelectOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchRestaurants()
    }
  }, [open])

  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/restaurants")
      const data = await res.json()
      if (data.success) {
        const options = data.restaurants.map((r: any) => ({
          value: r._id,
          label: r.name,
        }))
        setRestaurants(options)
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    await onSubmit(formData)
    setOpen(false)
    // Reset form
    setFormData({
      name: "",
      restaurantIds: [],
    })
  }

  const isFormValid = formData.name.trim() !== ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00D2A1] hover:bg-[#00B890] text-white" style={{ fontFamily: "Montserrat" }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Create Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Montserrat", fontSize: "24px", fontWeight: 700 }}>
            New Collection Period
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="name" style={{ fontFamily: "Montserrat", fontSize: "14px", color: "#000000" }}>
              Period Name
            </Label>
            <Input
              id="name"
              placeholder="Canada Q3 2025"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              style={{ fontFamily: "Montserrat" }}
              className="mt-2 rounded-xl border-[#E5E5E5] h-12"
            />
          </div>

          <div>
            <Label htmlFor="restaurants" style={{ fontFamily: "Montserrat", fontSize: "14px", color: "#000000" }}>
              Restaurants
            </Label>
            <div className="mt-2">
              <MultiSelect
                options={restaurants}
                value={formData.restaurantIds}
                onChange={(restaurantIds) => setFormData({ ...formData, restaurantIds })}
                placeholder="Select Restaurants"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
            style={{ fontFamily: "Montserrat" }}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-xl"
            style={{ fontFamily: "Montserrat" }}
          >
            {isSubmitting ? "Creating..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
