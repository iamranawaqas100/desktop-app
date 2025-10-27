"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Search } from "lucide-react"
import { Input } from "../ui/input"
import { Pagination, usePagination } from "../ui/pagination"

interface Restaurant {
  _id: string
  restaurantId: string
  name: string
  address: string
  status: "pending" | "assigned" | "in-progress" | "completed" | "verified"
  verifiedCount?: number
  totalCount?: number
}

interface CollectionPeriod {
  _id: string
  name: string
  year: number
  status: string
}

interface CollectorDashboardProps {
  collectorId: string
}

export function CollectorDashboard({ collectorId }: CollectorDashboardProps) {
  const [collectionPeriods, setCollectionPeriods] = useState<CollectionPeriod[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAssignedCollections()
  }, [collectorId])

  useEffect(() => {
    if (selectedPeriod) {
      fetchRestaurants()
    }
  }, [selectedPeriod])

  const fetchAssignedCollections = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/collection-periods/assigned")
      const data = await res.json()
      if (data.success) {
        const periods = data.periods || []
        setCollectionPeriods(periods)
        if (periods.length > 0 && !selectedPeriod) {
          setSelectedPeriod(periods[0]._id)
        }
      }
    } catch (error) {
      console.error("Error fetching assigned collections:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRestaurants = async () => {
    if (!selectedPeriod) return

    setLoading(true)
    try {
      const res = await fetch(`/api/restaurants?collectionPeriodId=${selectedPeriod}&assignedToMe=true`)
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

  const handleMenuCollection = (restaurantId: string) => {
    window.location.href = `/collector/restaurants/${restaurantId}`
  }

  const handleMenuQC = (restaurantId: string) => {
    window.location.href = `/collector/restaurants/${restaurantId}/qc`
  }

  const filteredRestaurants = restaurants.filter((r) => {
    const query = searchQuery?.toLowerCase() || ""
    const matchesSearch =
      r.name?.toLowerCase().includes(query) ||
      r.restaurantId?.toLowerCase().includes(query) ||
      r.address?.toLowerCase().includes(query)
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems: paginatedRestaurants,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
  } = usePagination(filteredRestaurants, 25, true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#000000]" style={{ fontFamily: "Montserrat" }}>
          Dashboard & Collection Periods
        </h1>
        <p className="text-sm text-[#737373] mt-1" style={{ fontFamily: "Montserrat" }}>
          Showing assigned restaurants under each collection period
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 rounded-xl border-[#E5E7EB] bg-white text-sm h-12 focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1]"
            style={{ fontFamily: "Montserrat" }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 pr-10 border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] bg-white hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1] transition-all appearance-none cursor-pointer min-w-[160px] h-12"
          style={{
            fontFamily: "Montserrat",
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.75rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.25em 1.25em",
          }}
        >
          <option value="all">Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="verified">Verified</option>
        </select>

        {/* Filter Button */}
        <Button
          className="bg-[#00D2A1] hover:bg-[#00B88D] text-white font-semibold px-8 py-3 rounded-xl h-12"
          style={{ fontFamily: "Montserrat" }}
        >
          Filter
        </Button>
      </div>

      {/* Collection Period Tabs & Table */}
      <Card className="overflow-hidden shadow-sm border border-[#E5E7EB]">
        {/* Tabs */}
        <div className="border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center overflow-x-auto">
            {collectionPeriods.map((period) => (
              <button
                key={period._id}
                onClick={() => setSelectedPeriod(period._id)}
                className={`px-6 py-4 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                  selectedPeriod === period._id
                    ? "border-[#00D2A1] text-[#00D2A1] bg-[#00D2A1]/5"
                    : "border-transparent text-[#737373] hover:text-[#000000] hover:bg-gray-50"
                }`}
                style={{ fontFamily: "Montserrat" }}
              >
                {period.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D2A1]" />
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="p-12 text-center text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
              No restaurants assigned in this collection period
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-white">
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Restaurant ID
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Restaurant Name
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Verified/Collected
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Status
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#F3F4F6]">
                  {paginatedRestaurants.map((restaurant) => (
                    <tr key={restaurant._id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                          {restaurant.restaurantId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                          {restaurant.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                          {restaurant.verifiedCount || 0}/{restaurant.totalCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={`font-medium px-3 py-1 text-xs capitalize ${
                            restaurant.status === "completed"
                              ? "bg-[#D1FAE5] text-[#065F46] border-[#34D399]"
                              : restaurant.status === "in-progress"
                              ? "bg-[#DBEAFE] text-[#1E40AF] border-[#60A5FA]"
                              : restaurant.status === "verified"
                              ? "bg-[#E0E7FF] text-[#4338CA] border-[#6366F1]"
                              : "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                          }`}
                          style={{ fontFamily: "Montserrat" }}
                        >
                          {restaurant.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleMenuCollection(restaurant._id)}
                            className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium px-4 py-2 h-9 text-sm rounded-lg"
                            style={{ fontFamily: "Montserrat" }}
                          >
                            Menu Collection
                          </Button>
                          <Button
                            onClick={() => handleMenuQC(restaurant._id)}
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium px-4 py-2 h-9 text-sm rounded-lg"
                            style={{ fontFamily: "Montserrat" }}
                          >
                            Menu QC
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-[#E5E7EB] bg-white">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

