"use client"

import { Edit, Search, Trash2 } from "lucide-react"
import * as React from "react"
import { useEffect, useState } from "react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Input } from "../ui/input"

interface CollectionPeriodWithStats {
  _id: string
  name: string
  year: number
  startDate: string
  endDate: string
  status: string
  restaurantList: string
  totalRestaurants: number
  completedRestaurants: number
  progressPercentage: number
}

// interface Collector {
//   _id: string
//   name: string
//   email: string
//   totalAssigned: number
// }

export function AdminDashboardTable() {
  const [collectionPeriods, setCollectionPeriods] = useState<CollectionPeriodWithStats[]>([])
  // const [collectors, setCollectors] = useState<Collector[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all")
  const [selectedRestaurantList, setSelectedRestaurantList] = useState<string>("all")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [periodsRes, collectorsRes] = await Promise.all([
        fetch("/api/collection-periods"),
        fetch("/api/users/collectors"),
      ])

      if (periodsRes.ok) {
        const data = await periodsRes.json()
        const periods = data.periods || []

        // Fetch restaurant stats for each period
        const periodsWithStats = await Promise.all(
          periods.map(async (period: any) => {
            try {
              const res = await fetch(`/api/restaurants?collectionPeriodId=${period._id}`)
              const restaurantData = await res.json()
              const restaurants = restaurantData.restaurants || []

              const totalRestaurants = restaurants.length
              const completedRestaurants = restaurants.filter((r: any) => r.status === "completed").length
              const progressPercentage = totalRestaurants > 0 ? Math.round((completedRestaurants / totalRestaurants) * 100) : 0

              return {
                ...period,
                restaurantList: "United States", // This should come from your data
                totalRestaurants,
                completedRestaurants,
                progressPercentage
              }
            } catch (error) {
              return {
                ...period,
                restaurantList: "United States",
                totalRestaurants: 0,
                completedRestaurants: 0,
                progressPercentage: 0
              }
            }
          })
        )

        setCollectionPeriods(periodsWithStats)
      }

      if (collectorsRes.ok) {
        const data = await collectorsRes.json()
        console.log("🔍 Collectors data:", data)
        // setCollectors(data.collectors || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // const handleAssignCollector = async (periodId: string, collectorId: string) => {
  //   if (!collectorId) return

  //   try {
  //     const res = await fetch(`/api/collection-periods/${periodId}/assign-collectors`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         collectorIds: [collectorId],
  //       }),
  //     })

  //     if (res.ok) {
  //       fetchData()
  //       onSuccess?.()
  //       setOpenDropdown(null)
  //     }
  //   } catch (error) {
  //     console.error("Error assigning collector:", error)
  //   }
  // }

  const handleOpenCollection = (periodId: string) => {
    window.location.href = `/admin/collection-periods/${periodId}`
  }

  const handleEditPeriod = (periodId: string) => {
    window.location.href = `/admin/collection-periods/${periodId}/edit`
  }

  const handleCreatePeriod = () => {
    window.location.href = `/admin/collection-periods/new`
  }

  const filteredPeriods = collectionPeriods.filter((period) => {
    const query = searchQuery?.toLowerCase() || ""
    const matchesSearch = period.name?.toLowerCase().includes(query) ||
      period.restaurantList?.toLowerCase().includes(query)
    const matchesPeriod = selectedPeriodFilter === "all" || period._id === selectedPeriodFilter
    const matchesRestaurantList = selectedRestaurantList === "all" || period.restaurantList === selectedRestaurantList

    return matchesSearch && matchesPeriod && matchesRestaurantList
  })

  const uniqueRestaurantLists = Array.from(new Set(collectionPeriods.map(p => p.restaurantList)))

  return (
    <div className="space-y-6">
      {/* Header with Create Period Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#000000]" style={{ fontFamily: "Montserrat" }}>
          Dashboard
        </h1>
        <Button
          onClick={handleCreatePeriod}
          className="bg-[#00D2A1] hover:bg-[#00B88D] text-white font-semibold px-6 py-3 rounded-xl shadow-md"
          style={{ fontFamily: "Montserrat" }}
        >
          <span className="mr-2 text-lg">+</span> Create Period
        </Button>
      </div>

      {/* Filters Row */}
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

        {/* Period Dropdown */}
        <select
          value={selectedPeriodFilter}
          onChange={(e) => setSelectedPeriodFilter(e.target.value)}
          className="px-4 py-3 pr-10 border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] bg-white hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1] transition-all appearance-none cursor-pointer min-w-[160px] h-12"
          style={{
            fontFamily: "Montserrat",
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.25em 1.25em'
          }}
        >
          <option value="all">Period</option>
          {collectionPeriods.map((period) => (
            <option key={period._id} value={period._id}>{period.name}</option>
          ))}
        </select>

        {/* Restaurant List Dropdown */}
        <select
          value={selectedRestaurantList}
          onChange={(e) => setSelectedRestaurantList(e.target.value)}
          className="px-4 py-3 pr-10 border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] bg-white hover:border-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#00D2A1] focus:border-[#00D2A1] transition-all appearance-none cursor-pointer min-w-[180px] h-12"
          style={{
            fontFamily: "Montserrat",
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.25em 1.25em'
          }}
        >
          <option value="all">Restaurant List</option>
          {uniqueRestaurantLists.map((list) => (
            <option key={list} value={list}>{list}</option>
          ))}
        </select>

        {/* Filter Button */}
        <Button
          className="bg-[#00D2A1] hover:bg-[#00B88D] text-white font-semibold px-8 py-3 rounded-xl h-12"
          style={{ fontFamily: "Montserrat" }}
        >
          Filter
        </Button>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden shadow-sm border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D2A1]" />
            </div>
          ) : filteredPeriods.length === 0 ? (
            <div className="p-12 text-center text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
              No collection periods found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "Montserrat" }}>
                    <div className="flex items-center gap-1">
                      Period
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                        <path d="M6 3L6 9M3 6L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "Montserrat" }}>
                    <div className="flex items-center gap-1">
                      Restaurant List
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                        <path d="M6 3L6 9M3 6L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "Montserrat" }}>
                    <div className="flex items-center gap-1">
                      Progress
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                        <path d="M6 3L6 9M3 6L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "Montserrat" }}>
                    <div className="flex items-center gap-1">
                      Progress
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                        <path d="M6 3L6 9M3 6L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "Montserrat" }}>
                    <div className="flex items-center gap-1">
                      Status
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                        <path d="M6 3L6 9M3 6L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: "Montserrat" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#F3F4F6]">
                {filteredPeriods.map((period) => (
                  <tr key={period._id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                        {period.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                        {period.restaurantList}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                        {period.completedRestaurants}/{period.totalRestaurants}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                        {period.progressPercentage}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={`font-medium px-3 py-1 text-xs capitalize ${period.status === "pending"
                            ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                            : period.status === "in-progress"
                              ? "bg-[#DBEAFE] text-[#1E40AF] border-[#60A5FA]"
                              : period.status === "completed"
                                ? "bg-[#D1FAE5] text-[#065F46] border-[#34D399]"
                                : "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]"
                          }`}
                        style={{ fontFamily: "Montserrat" }}
                      >
                        {period.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {/* Edit & Delete Icons */}
                        <button
                          onClick={() => handleEditPeriod(period._id)}
                          className="text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
                          title="Edit collection period"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="text-[#F87171] hover:text-[#EF4444] transition-colors"
                          title="Delete collection period"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* Open Collection Button */}
                        <Button
                          onClick={() => handleOpenCollection(period._id)}
                          variant="outline"
                          className="text-sm font-medium text-[#111827] border-[#E5E7EB] hover:bg-[#F9FAFB] px-4 py-2 h-9"
                          style={{ fontFamily: "Montserrat" }}
                        >
                          Open Collection
                        </Button>

                        {/* Assign Collectors Dropdown */}
                        {/* <DropdownMenu 
                          open={openDropdown === period._id}
                          onOpenChange={(open) => setOpenDropdown(open ? period._id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              className="bg-[#00D2A1] hover:bg-[#00B88D] text-white font-semibold px-4 py-2 h-9 text-sm rounded-lg"
                              style={{ fontFamily: "Montserrat" }}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1.5">
                                <path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              Assign Collectors
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-56 bg-white border border-[#E5E7EB] shadow-lg rounded-xl p-2"
                          >
                            <div className="px-3 py-2 mb-1">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
                                <input
                                  type="text"
                                  placeholder="Search"
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00D2A1]"
                                  style={{ fontFamily: "Montserrat" }}
                                />
                              </div>
                            </div>
                            {collectors.map((collector) => (
                              <DropdownMenuItem
                                key={collector._id}
                                onClick={() => handleAssignCollector(period._id, collector._id)}
                                className="px-3 py-2 text-sm text-[#111827] hover:bg-[#F3F4F6] rounded-lg cursor-pointer transition-colors"
                                style={{ fontFamily: "Montserrat" }}
                              >
                                {collector.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

