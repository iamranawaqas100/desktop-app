"use client"

import { PieChart, Settings, LogOut } from "lucide-react"
import { useState } from "react"
import { signOut } from "next-auth/react"
import Image from "next/image"
import { cn } from "../../../lib/utils"
import { useToast } from "../ui/use-toast"
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

export interface CollectorSidebarProps {
  activePath?: string
}

export function CollectorSidebar({ activePath = "/collector" }: CollectorSidebarProps) {
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
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E5E5E5] flex flex-col z-40">
        <div className="p-6 border-b border-[#E5E5E5]">
          <Image
            src="/completeLogo.png"
            alt="DataEssential - Global Food & Beverage Intelligence"
            width={180}
            height={60}
            className="w-full h-auto"
          />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <a
            href="/collector"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
              activePath === "/collector" ? "bg-[#00D2A1] text-white" : "text-foreground hover:bg-[#F6F6F6]",
            )}
          >
            <PieChart className="h-5 w-5" />
            <span>Dashboard</span>
          </a>
          <a
            href="/collector/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
              activePath === "/collector/settings" ? "bg-[#00D2A1] text-white" : "text-foreground hover:bg-[#F6F6F6]",
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </a>
          <button
            onClick={() => setShowSignOutDialog(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-foreground hover:bg-[#F6F6F6]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#E5E5E5] text-xs text-muted-foreground">All rights reserved, 2025.</div>
      </aside>

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
