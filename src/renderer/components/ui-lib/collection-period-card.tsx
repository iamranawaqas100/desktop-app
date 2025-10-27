"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"

interface Quarter {
  _id: string
  quarterNumber: number
  name: string
  startDate: string
  endDate: string
  status: "upcoming" | "active" | "completed"
  restaurantCount: number
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
  assignedCollectors?: string[]
  createdAt: string
}

interface CollectionPeriodCardProps {
  period: CollectionPeriod
  quarters: Quarter[]
  onViewDetails: (periodId: string) => void
  onAddRestaurant: (periodId: string, quarterId: string) => void
  onUpdateStatus?: (periodId: string, status: CollectionPeriod["status"]) => void
}

export function CollectionPeriodCard({
  period,
  quarters,
  onViewDetails,
  onAddRestaurant,
  onUpdateStatus,
}: CollectionPeriodCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (status: CollectionPeriod["status"]) => {
    switch (status) {
      case "planning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getQuarterStatusColor = (status: Quarter["status"]) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const completionPercentage =
    period.restaurantCount && period.completedRestaurants
      ? Math.round((period.completedRestaurants / period.restaurantCount) * 100)
      : 0

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "Montserrat" }}>
                {period.name}
              </h3>
              <Badge className={getStatusColor(period.status)}>
                {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
              </Badge>
            </div>
            {period.description && (
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                {period.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#00B7B7] hover:text-[#009999]"
          >
            {isExpanded ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat" }}>
              {quarters.length}
            </div>
            <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
              Periods
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat" }}>
              {period.restaurantCount || 0}
            </div>
            <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
              Restaurants
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: "Montserrat" }}>
              {period.assignedCollectors?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
              Collectors
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600" style={{ fontFamily: "Montserrat" }}>
              {completionPercentage}%
            </div>
            <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
              Completed
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {period.restaurantCount && period.restaurantCount > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#00B7B7] h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        )}

        {/* Quarters (Expanded) */}
        {isExpanded && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-sm text-foreground" style={{ fontFamily: "Montserrat" }}>
              Periods in {period.year}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quarters.map((quarter) => (
                <div
                  key={quarter._id}
                  className="border rounded-lg p-4 hover:border-[#00B7B7] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm" style={{ fontFamily: "Montserrat" }}>
                        {quarter.name}
                      </div>
                      <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                        {formatDate(quarter.startDate)} - {formatDate(quarter.endDate)}
                      </div>
                    </div>
                    <Badge className={getQuarterStatusColor(quarter.status)} style={{ fontSize: "10px" }}>
                      {quarter.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                      {quarter.restaurantCount || 0} restaurants
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAddRestaurant(period._id, quarter._id)}
                      className="text-[#00B7B7] hover:text-[#009999] h-7 text-xs"
                    >
                      + Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(period._id)}
            style={{ fontFamily: "Montserrat" }}
          >
            View Details
          </Button>
          {onUpdateStatus && period.status === "planning" && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(period._id, "active")}
              className="bg-[#00B7B7] hover:bg-[#009999]"
              style={{ fontFamily: "Montserrat" }}
            >
              Activate
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
