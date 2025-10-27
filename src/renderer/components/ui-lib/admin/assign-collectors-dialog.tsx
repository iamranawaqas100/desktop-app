"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Search } from "lucide-react"

interface Collector {
  _id: string
  name: string
  email: string
  totalAssigned: number
  pending: number
  inProgress: number
  completed: number
  verified: number
}

interface AssignCollectorsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionPeriodId: string
  collectionPeriodName: string
  currentCollectors?: string[]
  onSuccess?: () => void
}

export function AssignCollectorsDialog({
  open,
  onOpenChange,
  collectionPeriodId,
  collectionPeriodName,
  currentCollectors: _currentCollectors = [],
  onSuccess,
}: AssignCollectorsDialogProps) {
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [selectedCollectorId, setSelectedCollectorId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch all collectors
  useEffect(() => {
    if (open) {
      fetchCollectors()
    }
  }, [open])

  const fetchCollectors = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users/collectors")
      const data = await res.json()
      if (data.success) {
        setCollectors(data.collectors)
      }
    } catch (error) {
      console.error("Error fetching collectors:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedCollectorId) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/collection-periods/${collectionPeriodId}/assign-collectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectorIds: [selectedCollectorId],
        }),
      })

      if (res.ok) {
        onSuccess?.()
        onOpenChange(false)
        setSelectedCollectorId(null)
        setSearchQuery("")
      } else {
        const error = await res.json()
        console.error("Error assigning collector:", error)
      }
    } catch (error) {
      console.error("Error assigning collector:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCollectors = collectors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Montserrat" }}>Assign Collector</DialogTitle>
          <DialogDescription style={{ fontFamily: "Montserrat" }}>
            Select a collector for {collectionPeriodName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-[#E5E5E5] h-12"
              style={{ fontFamily: "Montserrat" }}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto rounded-xl border border-[#E5E5E5]">
            {loading ? (
              <div className="p-8 text-center text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D2A1]" />
                <p className="mt-4">Loading collectors...</p>
              </div>
            ) : filteredCollectors.length === 0 ? (
              <div className="p-8 text-center text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                No collectors found
              </div>
            ) : (
              <div>
                {filteredCollectors.map((collector) => (
                  <div
                    key={collector._id}
                    onClick={() => setSelectedCollectorId(collector._id)}
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-[#E5E5E5] last:border-b-0 ${
                      selectedCollectorId === collector._id ? "bg-[#F7F7F7]" : "hover:bg-[#F7F7F7]"
                    }`}
                  >
                    <div className="font-medium text-[#000000]" style={{ fontFamily: "Montserrat" }}>
                      {collector.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setSelectedCollectorId(null)
              setSearchQuery("")
            }}
            disabled={submitting}
            style={{ fontFamily: "Montserrat" }}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedCollectorId}
            className="bg-[#00D2A1] hover:bg-[#00B890] text-white rounded-xl"
            style={{ fontFamily: "Montserrat" }}
          >
            {submitting ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
