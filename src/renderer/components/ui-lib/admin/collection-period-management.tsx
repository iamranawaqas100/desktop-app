"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Search, Calendar } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"

interface CollectionPeriod {
  _id: string
  name: string
  startDate: string
  endDate: string
  status: "active" | "inactive" | "completed"
  createdAt: string
}

interface CollectionPeriodManagementProps {
  onAddPeriod: (period: Omit<CollectionPeriod, "_id" | "createdAt">) => Promise<void>
  onUpdatePeriod: (id: string, period: Partial<CollectionPeriod>) => Promise<void>
  onDeletePeriod: (id: string) => Promise<void>
  periods: CollectionPeriod[]
  isLoading?: boolean
}

export function CollectionPeriodManagement({
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
  periods,
  isLoading,
}: CollectionPeriodManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [selectedPeriod, setSelectedPeriod] = React.useState<CollectionPeriod | null>(null)
  const [formData, setFormData] = React.useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "active" as "active" | "inactive" | "completed",
  })

  const filteredPeriods = periods.filter((period) => period.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleAdd = async () => {
    await onAddPeriod(formData)
    setShowAddDialog(false)
    setFormData({ name: "", startDate: "", endDate: "", status: "active" })
  }

  const handleEdit = async () => {
    if (selectedPeriod) {
      await onUpdatePeriod(selectedPeriod._id, formData)
      setShowEditDialog(false)
      setSelectedPeriod(null)
      setFormData({ name: "", startDate: "", endDate: "", status: "active" })
    }
  }

  const handleDelete = async () => {
    if (selectedPeriod) {
      await onDeletePeriod(selectedPeriod._id)
      setShowDeleteDialog(false)
      setSelectedPeriod(null)
    }
  }

  const openEditDialog = (period: CollectionPeriod) => {
    setSelectedPeriod(period)
    setFormData({
      name: period.name,
      startDate: period.startDate.split("T")[0],
      endDate: period.endDate.split("T")[0],
      status: period.status,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (period: CollectionPeriod) => {
    setSelectedPeriod(period)
    setShowDeleteDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
          <Input
            placeholder="Search collection periods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            style={{ fontFamily: "Montserrat" }}
          />
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#00D2A1] hover:bg-[#00b890]"
          style={{ fontFamily: "Montserrat" }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Collection Period
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-[#737373]" style={{ fontFamily: "Montserrat" }}>
              Loading...
            </p>
          </div>
        ) : filteredPeriods.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-[#737373]" style={{ fontFamily: "Montserrat" }}>
              No collection periods found
            </p>
          </div>
        ) : (
          filteredPeriods.map((period) => (
            <div
              key={period._id}
              className="bg-white rounded-xl border border-[#E5E5E5] p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#00D2A1]/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-[#00D2A1]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground" style={{ fontFamily: "Montserrat" }}>
                      {period.name}
                    </h3>
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1"
                      style={{
                        fontFamily: "Montserrat",
                        backgroundColor:
                          period.status === "active"
                            ? "#00D2A1"
                            : period.status === "completed"
                              ? "#0494F7"
                              : "#FF8D54",
                        color: "white",
                      }}
                    >
                      {period.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditDialog(period)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Pencil className="h-4 w-4 text-[#0494F7]" />
                  </button>
                  <button
                    onClick={() => openDeleteDialog(period)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-[#FF4D4F]" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                    Start Date:
                  </span>
                  <span className="text-foreground font-medium" style={{ fontFamily: "Montserrat" }}>
                    {new Date(period.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                    End Date:
                  </span>
                  <span className="text-foreground font-medium" style={{ fontFamily: "Montserrat" }}>
                    {new Date(period.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Period Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Add Collection Period</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Create a new collection period for restaurant data gathering.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" style={{ fontFamily: "Montserrat" }}>
                Period Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q1 2025"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate" style={{ fontFamily: "Montserrat" }}>
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" style={{ fontFamily: "Montserrat" }}>
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" style={{ fontFamily: "Montserrat" }}>
                Status
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as "active" | "inactive" | "completed" })
                }
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdd}
              className="bg-[#00D2A1] hover:bg-[#00b890]"
              style={{ fontFamily: "Montserrat" }}
            >
              Add Period
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Period Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Edit Collection Period</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Update collection period information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" style={{ fontFamily: "Montserrat" }}>
                Period Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-startDate" style={{ fontFamily: "Montserrat" }}>
                Start Date
              </Label>
              <Input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate" style={{ fontFamily: "Montserrat" }}>
                End Date
              </Label>
              <Input
                id="edit-endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status" style={{ fontFamily: "Montserrat" }}>
                Status
              </Label>
              <select
                id="edit-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as "active" | "inactive" | "completed" })
                }
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEdit}
              className="bg-[#00D2A1] hover:bg-[#00b890]"
              style={{ fontFamily: "Montserrat" }}
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Period Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Delete Collection Period</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Are you sure you want to delete {selectedPeriod?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: "Montserrat" }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#FF4D4F] hover:bg-[#ff3333]"
              style={{ fontFamily: "Montserrat" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
