"use client"

import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"
import { useState } from "react"

export interface Restaurant {
  id: string
  name: string
  verifiedDate: string
  status: "completed" | "pending" | "in-progress"
}

export interface RestaurantTableProps {
  restaurants: Restaurant[]
  collectionPeriods: string[]
  activePeriod: string
  onPeriodChange: (period: string) => void
  onRestaurantClick: (id: string) => void
  onMenuCollection?: (id: string) => void
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function RestaurantTable({
  restaurants,
  collectionPeriods,
  activePeriod,
  onPeriodChange,
  onRestaurantClick,
  onMenuCollection,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: RestaurantTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || restaurant.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "Montserrat" }}>
          Dashboard & Collection Periods
        </h1>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
          Showing assigned restaurants under each collection period
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 h-11 bg-white border-[#E5E5E5]"
            style={{ fontFamily: "Montserrat" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-11 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D2A1]"
            style={{ fontFamily: "Montserrat" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {collectionPeriods.map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              activePeriod === period
                ? "bg-white text-foreground border-2 border-[#00D2A1]"
                : "bg-white text-muted-foreground border border-[#E5E5E5] hover:border-[#00D2A1]",
            )}
            style={{ fontFamily: "Montserrat" }}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
        {/* Table Header */}
        <div
          className="hidden md:grid gap-4 bg-[#F6F6F6] px-6 py-4 font-semibold text-sm text-foreground border-b border-[#E5E5E5]"
          style={{ gridTemplateColumns: "100px 1fr 150px 120px 250px", fontFamily: "Montserrat" }}
        >
          <div>Restaurant ID</div>
          <div>Restaurant Name</div>
          <div>Verified/Collected</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {/* Table Rows */}
        {filteredRestaurants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
              No restaurants found
            </p>
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="grid md:grid-cols-[100px_1fr_150px_120px_250px] gap-4 px-6 py-4 border-b border-[#E5E5E5] last:border-0 hover:bg-[#F6F6F6]/50 transition-colors text-sm"
            >
              <div className="flex items-center text-foreground" style={{ fontFamily: "Montserrat" }}>
                <span className="md:hidden font-semibold mr-2">ID:</span>
                {restaurant.id}
              </div>
              <div className="flex items-center text-foreground" style={{ fontFamily: "Montserrat" }}>
                <span className="md:hidden font-semibold mr-2">Name:</span>
                {restaurant.name}
              </div>
              <div className="flex items-center text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                <span className="md:hidden font-semibold mr-2 text-foreground">Date:</span>
                {restaurant.verifiedDate}
              </div>
              <div className="flex items-center">
                <span className="md:hidden font-semibold mr-2">Status:</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    restaurant.status === "completed" && "bg-[#00D2A1]/10 text-[#00D2A1]",
                    restaurant.status === "pending" && "bg-[#FF8D54]/10 text-[#FF8D54]",
                    restaurant.status === "in-progress" && "bg-[#0494F7]/10 text-[#0494F7]",
                  )}
                  style={{ fontFamily: "Montserrat" }}
                >
                  {restaurant.status === "completed" && "Completed"}
                  {restaurant.status === "pending" && "Pending"}
                  {restaurant.status === "in-progress" && "In Progress"}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-[#FF8D54] text-white hover:bg-[#FF7A3D] h-9 px-4 rounded-lg font-medium"
                  style={{ fontFamily: "Montserrat" }}
                  onClick={() => onMenuCollection?.(restaurant.id)}
                >
                  Menu Collection
                </Button>
                <Button
                  size="sm"
                  className="bg-[#0494F7] text-white hover:bg-[#0380D6] h-9 px-4 rounded-lg font-medium"
                  style={{ fontFamily: "Montserrat" }}
                  onClick={() => onRestaurantClick(restaurant.id)}
                >
                  Menu QC
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="h-9 px-3 border-[#E5E5E5]"
            style={{ fontFamily: "Montserrat" }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange?.(page)}
              className={cn(
                "h-9 w-9",
                currentPage === page
                  ? "bg-[#00D2A1] text-white hover:bg-[#00b890]"
                  : "border-[#E5E5E5] hover:border-[#00D2A1]",
              )}
              style={{ fontFamily: "Montserrat" }}
            >
              {page}
            </Button>
          ))}
          {totalPages > 5 && <span className="text-muted-foreground">...</span>}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className="h-9 px-3 border-[#E5E5E5]"
            style={{ fontFamily: "Montserrat" }}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
