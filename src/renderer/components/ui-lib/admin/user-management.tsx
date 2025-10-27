"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
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

interface User {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface UserManagementProps {
  onAddUser: (user: Omit<User, "_id" | "createdAt"> & { password: string }) => Promise<void>
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>
  onDeleteUser: (id: string) => Promise<void>
  users: User[]
  isLoading?: boolean
}

export function UserManagement({ onAddUser, onUpdateUser, onDeleteUser, users, isLoading }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [formData, setFormData] = React.useState({ name: "", email: "", role: "collector", password: "" })

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAdd = async () => {
    await onAddUser(formData)
    setShowAddDialog(false)
    setFormData({ name: "", email: "", role: "collector", password: "" })
  }

  const handleEdit = async () => {
    if (selectedUser) {
      await onUpdateUser(selectedUser._id, { name: formData.name, email: formData.email, role: formData.role })
      setShowEditDialog(false)
      setSelectedUser(null)
      setFormData({ name: "", email: "", role: "collector", password: "" })
    }
  }

  const handleDelete = async () => {
    if (selectedUser) {
      await onDeleteUser(selectedUser._id)
      setShowDeleteDialog(false)
      setSelectedUser(null)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({ name: user.name, email: user.email, role: user.role, password: "" })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setShowDeleteDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
          <Input
            placeholder="Search users..."
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
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-[#E5E5E5]">
            <tr>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                style={{ fontFamily: "Montserrat" }}
              >
                Name
              </th>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                style={{ fontFamily: "Montserrat" }}
              >
                Email
              </th>
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-foreground"
                style={{ fontFamily: "Montserrat" }}
              >
                Role
              </th>
              <th
                className="px-6 py-4 text-right text-sm font-semibold text-foreground"
                style={{ fontFamily: "Montserrat" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                  Loading...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-foreground" style={{ fontFamily: "Montserrat" }}>
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        fontFamily: "Montserrat",
                        backgroundColor:
                          user.role === "admin" ? "#FF8D54" : user.role === "supervisor" ? "#0494F7" : "#00D2A1",
                        color: "white",
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(user)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-[#0494F7]" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(user)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-[#FF4D4F]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Add New User</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Create a new user account with the specified role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" style={{ fontFamily: "Montserrat" }}>
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" style={{ fontFamily: "Montserrat" }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" style={{ fontFamily: "Montserrat" }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" style={{ fontFamily: "Montserrat" }}>
                Role
              </Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="collector">Collector</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
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
              Add User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Edit User</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Update user information and role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" style={{ fontFamily: "Montserrat" }}>
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" style={{ fontFamily: "Montserrat" }}>
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ fontFamily: "Montserrat" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role" style={{ fontFamily: "Montserrat" }}>
                Role
              </Label>
              <select
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E5E5] bg-white"
                style={{ fontFamily: "Montserrat" }}
              >
                <option value="collector">Collector</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
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

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Montserrat" }}>Delete User</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: "Montserrat" }}>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
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
