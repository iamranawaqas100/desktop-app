"use client"

import { Card } from "../ui/card"
import { Users, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"

interface CollectorWorkload {
  collectorId: string
  collectorName: string
  collectorEmail: string
  totalAssigned: number
  pending: number
  inProgress: number
  completed: number
  verified: number
  completionRate: number
}

interface CollectorWorkloadDashboardProps {
  workload: CollectorWorkload[]
  isLoading?: boolean
}

export function CollectorWorkloadDashboard({ workload, isLoading }: CollectorWorkloadDashboardProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B7B7]" />
        <p className="mt-4 text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
          Loading collector workload...
        </p>
      </div>
    )
  }

  if (workload.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: "Montserrat" }}>
          No Collectors Assigned
        </h3>
        <p className="text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
          Assign collectors to this collection period to see their workload
        </p>
      </div>
    )
  }

  const totalRestaurants = workload.reduce((sum, w) => sum + w.totalAssigned, 0)
  const totalCompleted = workload.reduce((sum, w) => sum + w.completed + w.verified, 0)
  const avgCompletionRate = Math.round(
    workload.reduce((sum, w) => sum + w.completionRate, 0) / workload.length
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: "Montserrat" }}>
                {workload.length}
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                Collectors
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: "Montserrat" }}>
                {totalRestaurants}
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                Total Assigned
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: "Montserrat" }}>
                {totalCompleted}
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                Completed
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: "Montserrat" }}>
                {avgCompletionRate}%
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                Avg Completion
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Workload Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  Collector
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  Total
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  Pending
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  In Progress
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  Completed
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  Verified
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ fontFamily: "Montserrat" }}>
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workload.map((collector) => (
                <tr key={collector.collectorId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium" style={{ fontFamily: "Montserrat" }}>
                        {collector.collectorName}
                      </div>
                      <div className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
                        {collector.collectorEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-lg" style={{ fontFamily: "Montserrat" }}>
                      {collector.totalAssigned}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      {collector.pending}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      {collector.inProgress}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      {collector.completed}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      {collector.verified}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[100px]">
                        <div
                          className="bg-[#00B7B7] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${collector.completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium min-w-[45px] text-right" style={{ fontFamily: "Montserrat" }}>
                        {collector.completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
