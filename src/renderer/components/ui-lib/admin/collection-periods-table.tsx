"use client"

import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Calendar } from "lucide-react"

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface CollectionPeriod {
  _id: string
  name: string
  year: number
  description?: string
  numberOfQuarters: number
  status: "planning" | "active" | "completed" | "archived"
  quarterCount?: number
  restaurantCount?: number
  completedRestaurants?: number
  createdAt: string
}

interface CollectionPeriodsTableProps {
  periods: CollectionPeriod[]
  users: User[]
  onAssignCollectors?: (periodId: string, collectorIds: string[]) => void
  onOpenCollection: (periodId: string) => void
  onEditPeriod?: (periodId: string) => void
  onDeletePeriod?: (periodId: string) => void
  isLoading?: boolean
}

export function CollectionPeriodsTable({
  periods,
  users,
  onOpenCollection,
  isLoading,
}: CollectionPeriodsTableProps) {
  const getStatusColor = (status: CollectionPeriod["status"]) => {
    switch (status) {
      case "planning":
        return "bg-yellow-100 text-yellow-800"
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B7B7]" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Collection Periods Yet</h3>
        <p className="text-muted-foreground mb-4">Create your first collection period</p>
        <Button onClick={() => (window.location.href = "/admin/collection-periods")}>
          Go to Collection Periods
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of collection periods</p>
        </div>
        <Button onClick={() => (window.location.href = "/admin/collection-periods")}>
          Manage Collection Periods
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">Total Collections</p>
          <p className="text-3xl font-bold mt-2">{periods.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-3xl font-bold mt-2">{periods.filter((p) => p.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">Restaurants</p>
          <p className="text-3xl font-bold mt-2">{periods.reduce((sum, p) => sum + (p.restaurantCount || 0), 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">Collectors</p>
          <p className="text-3xl font-bold mt-2">{users.filter((u) => u.role === "collector").length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Collection Periods</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quarters</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurants</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {periods.map((period) => (
              <tr key={period._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium">{period.name}</div>
                  {period.description && <div className="text-xs text-gray-500">{period.description.substring(0, 50)}</div>}
                </td>
                <td className="px-6 py-4 text-sm">{period.year}</td>
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(period.status)}>{period.status}</Badge>
                </td>
                <td className="px-6 py-4 text-sm">{period.numberOfQuarters}</td>
                <td className="px-6 py-4 text-sm">{period.restaurantCount || 0}</td>
                <td className="px-6 py-4 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onOpenCollection(period._id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
