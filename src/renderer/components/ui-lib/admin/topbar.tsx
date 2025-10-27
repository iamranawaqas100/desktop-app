"use client"

import * as React from "react"
import { Bell, ChevronDown } from "lucide-react"
import { signOut } from "next-auth/react"
import { useToast } from "../ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
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

interface AdminTopbarProps {
  userName?: string
  userRole?: string
  notifications?: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }>
}

export function AdminTopbar({
  userName = "Admin User",
  userRole = "Administrator",
  notifications = [],
}: AdminTopbarProps) {
  const [showNotifications, setShowNotifications] = React.useState(false)
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false)
  const { addToast } = useToast()

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleSignOut = async () => {
    try {
      setShowSignOutDialog(false)
      
      addToast({
        title: "Signing out...",
        description: "See you next time!",
        variant: "success",
        duration: 2000,
      })

      // Small delay for toast to show
      setTimeout(async () => {
        await signOut({ redirect: true, callbackUrl: "/login" })
      }, 500)
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "error",
      })
    }
  }

  return (
    <>
      <header className="fixed top-0 left-64 right-0 h-20 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-8 z-30">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat" }}>
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Bell className="h-5 w-5 text-[#737373]" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-[#FF4D4F] rounded-full" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 font-semibold border-b" style={{ fontFamily: "Montserrat" }}>
                Notifications ({unreadCount} unread)
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem key={notification.id} className="p-3 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-sm" style={{ fontFamily: "Montserrat" }}>
                        {notification.title}
                      </div>
                      <div className="text-xs text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                        {notification.message}
                      </div>
                      <div className="text-xs text-[#00D2A1]" style={{ fontFamily: "Montserrat" }}>
                        {notification.time}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#00D2A1] flex items-center justify-center text-white font-semibold">
                  {userName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Montserrat" }}>
                    {userName}
                  </div>
                  <div className="text-xs text-[#737373]" style={{ fontFamily: "Montserrat" }}>
                    {userRole}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-[#737373]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer" style={{ fontFamily: "Montserrat" }}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" style={{ fontFamily: "Montserrat" }}>
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-[#FF4D4F]"
                style={{ fontFamily: "Montserrat" }}
                onClick={() => setShowSignOutDialog(true)}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-[#00D2A1] hover:bg-[#00b890]">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
