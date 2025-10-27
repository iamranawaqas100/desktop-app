"use client"

import { Building2, LayoutDashboard, List, LogOut, Settings, Users } from "lucide-react"
import { signOut } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import { cn } from "../../../lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog"
import { useToast } from "../ui/use-toast"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/restaurant-lists", label: "Restaurant Lists", icon: List },
  { href: "/admin/restaurants", label: "Restaurants", icon: Building2 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false)
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E5E5E5] flex flex-col z-40">
      <div className="p-6 border-b border-[#E5E5E5]">
        <Image src="/completeLogo.png" alt="DataEssential" width={200} height={36} className="w-auto h-9" priority />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                isActive ? "bg-[#00D2A1] text-white" : "text-[#737373] hover:bg-gray-50",
              )}
              style={{ fontFamily: "Montserrat" }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#E5E5E5]">
        <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
          <AlertDialogTrigger asChild>
            <button
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-[#737373] hover:bg-gray-50 w-full"
              style={{ fontFamily: "Montserrat" }}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Sign out</span>
            </button>
          </AlertDialogTrigger>
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
      </div>

      <div className="p-4 text-xs text-[#737373] text-center" style={{ fontFamily: "Montserrat" }}>
        All rights reserved, 2025.
      </div>
    </aside>
  )
}
