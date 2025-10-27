"use client"

import { Bell, ChevronDown } from "lucide-react"
import { useState } from "react"
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

interface CollectorTopbarProps {
  name: string
  role: string
  avatarUrl?: string
  notificationCount?: number
  notifications?: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }>
}

export function CollectorTopbar({
  name,
  role,
  avatarUrl,
  notificationCount = 0,
  notifications = [],
}: CollectorTopbarProps) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const { addToast } = useToast()

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
      <header className="bg-white border-b border-[#E5E5E5] px-8 py-4 flex items-center justify-end gap-4 sticky top-0 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 hover:bg-[#F6F6F6] rounded-lg transition-colors">
              <Bell className="h-5 w-5 text-foreground" />
              {notificationCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#00D2A1] rounded-full" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {notificationCount > 0 && <p className="text-xs text-muted-foreground">{notificationCount} unread</p>}
            </div>
            {notifications.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="px-4 py-3 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.read && <span className="w-2 h-2 bg-[#00D2A1] rounded-full mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-[#F6F6F6] rounded-lg px-3 py-2 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#E5E5E5] overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl || "/placeholder.svg"} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground font-semibold">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-foreground">{name}</div>
                <div className="text-xs text-muted-foreground capitalize">{role}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/collector/settings" className="cursor-pointer">
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSignOutDialog(true)} className="text-destructive cursor-pointer">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
