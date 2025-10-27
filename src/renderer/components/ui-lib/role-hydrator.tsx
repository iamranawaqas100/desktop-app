"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

export function RoleHydrator() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      // Hydrate role information on client side if needed
      console.log("[v0] User role hydrated:", (session.user as any).role)
    }
  }, [session])

  return null
}
