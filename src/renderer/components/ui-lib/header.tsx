"use client"

import { signOut } from "next-auth/react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { LogOut, User } from "lucide-react"
import { useToast } from "./ui/use-toast"

export function AppHeader() {
  const { addToast } = useToast()

  const handleSignOut = async () => {
    try {
      addToast({
        title: "Signing out...",
        description: "You are being signed out.",
        variant: "default",
      })
      
      await signOut({ 
        redirect: true, 
        callbackUrl: "/login" 
      })
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "error",
      })
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Collector 2.0</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
