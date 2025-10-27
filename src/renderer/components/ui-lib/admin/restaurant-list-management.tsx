"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { useAsyncActions } from "../../../lib/useAsyncAction"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
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

interface RestaurantList {
  _id: number
  name: string
  description?: string
  restaurantCount: number
  createdAt: string
  updatedAt: string
}

interface RestaurantListManagementProps {
  onAddList: (list: { name: string; description?: string }, file?: File) => Promise<void>
  onUpdateList: (id: number, list: { name: string; description?: string }, file?: File) => Promise<void>
  onDeleteList: (id: number) => Promise<void>
  lists: RestaurantList[]
  isLoading?: boolean
}

export function RestaurantListManagement({
  onAddList,
  onUpdateList,
  onDeleteList,
  lists,
  isLoading,
}: RestaurantListManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedList, setSelectedList] = useState<RestaurantList | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    file: null as File | null,
  })

  // Use async actions hook for managing loading states
  const asyncActions = useAsyncActions<"add" | "edit" | "delete">()

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({ name: "", description: "", file: null })
  }

  const handleAdd = async () => {
    await asyncActions.execute("add", async () => {
      await onAddList(
        { name: formData.name, description: formData.description },
        formData.file || undefined
      )
      setShowAddDialog(false)
      resetForm()
    })
  }

  const handleEdit = async () => {
    if (!selectedList) return
    await asyncActions.execute("edit", async () => {
      await onUpdateList(
        selectedList._id,
        { name: formData.name, description: formData.description },
        formData.file || undefined
      )
      setShowEditDialog(false)
      setSelectedList(null)
      resetForm()
    })
  }

  const handleDelete = async () => {
    if (!selectedList) return
    await asyncActions.execute("delete", async () => {
      await onDeleteList(selectedList._id)
      setShowDeleteDialog(false)
      setSelectedList(null)
    })
  }

  const openEditDialog = (list: RestaurantList) => {
    setSelectedList(list)
    setFormData({
      name: list.name,
      description: list.description || "",
      file: null,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (list: RestaurantList) => {
    setSelectedList(list)
    setShowDeleteDialog(true)
  }

  const downloadTemplate = () => {
    const csv = "name,address,phone,email,website\nThe Golden Fork,123 Main St New York NY,+1 212-555-0101,contact@goldenfork.com,https://goldenfork.com\n"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "restaurant-import-template.csv"
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
          <Input
            placeholder="Search restaurant lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl border-[#E5E7EB]"
            style={{ fontFamily: "Montserrat" }}
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="h-12 px-6 rounded-xl border-[#E5E7EB]"
            style={{ fontFamily: "Montserrat" }}
          >
            <Download className="h-5 w-5 mr-2" />
            CSV Template
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="h-12 px-6 rounded-xl bg-[#00D2A1] hover:bg-[#00B88E] text-white"
            style={{ fontFamily: "Montserrat" }}
          >
            <Plus className="h-5 w-5 mr-2" />
            New List
          </Button>
        </div>
      </div>

      {/* Lists Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                  List Name
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                  Description
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                  Restaurants
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                  Created
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#6B7280]">
                    Loading...
                  </td>
                </tr>
              ) : filteredLists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#6B7280]">
                    No restaurant lists found
                  </td>
                </tr>
              ) : (
                filteredLists.map((list) => (
                  <tr key={list._id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#111827]" style={{ fontFamily: "Montserrat" }}>
                        {list.name}
                      </p>
                      <p className="text-sm text-[#6B7280]">ID: {list._id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                      {list.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#DBEAFE] text-[#1E40AF]">
                        {list.restaurantCount} restaurants
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]" style={{ fontFamily: "Montserrat" }}>
                      {new Date(list.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(list)}
                          className="h-9 w-9 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(list)}
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add List Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat" }}>Create Restaurant List</DialogTitle>
            <DialogDescription>Create a new restaurant list with optional CSV import.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" style={{ fontFamily: "Montserrat" }}>
                List Name *
              </Label>
              <Input
                id="name"
                placeholder="NYC Target Restaurants"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description" style={{ fontFamily: "Montserrat" }}>
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Target restaurants in New York City"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="csvFile" style={{ fontFamily: "Montserrat" }}>
                CSV File (Optional)
              </Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="mt-2"
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Upload a CSV file to import restaurants. Required columns: name, address
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowAddDialog(false); resetForm(); }}
              disabled={asyncActions.isLoading("add")}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAdd} 
              disabled={!formData.name.trim() || asyncActions.isLoading("add")}
            >
              {asyncActions.isLoading("add") ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat" }}>Edit Restaurant List</DialogTitle>
            <DialogDescription>Update the restaurant list details and optionally replace restaurants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editName" style={{ fontFamily: "Montserrat" }}>
                List Name *
              </Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="editDescription" style={{ fontFamily: "Montserrat" }}>
                Description
              </Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="editCsvFile" style={{ fontFamily: "Montserrat" }}>
                Replace CSV File (Optional)
              </Label>
              <Input
                id="editCsvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="mt-2"
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Upload a new CSV to replace all existing restaurants in this list
              </p>
              {selectedList && (
                <p className="text-xs text-[#DC2626] mt-1">
                  Current: {selectedList.restaurantCount} restaurants will be replaced if you upload a new file
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowEditDialog(false); resetForm(); }}
              disabled={asyncActions.isLoading("edit")}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={!formData.name.trim() || asyncActions.isLoading("edit")}
            >
              {asyncActions.isLoading("edit") ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedList?.name}"? This action cannot be undone.
              This will not delete the restaurants, only the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={asyncActions.isLoading("delete")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={asyncActions.isLoading("delete")}
              className="bg-red-600 hover:bg-red-700"
            >
              {asyncActions.isLoading("delete") ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
