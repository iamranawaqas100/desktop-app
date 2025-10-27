"use client"

import type React from "react"

import { ToastProvider as Provider, useToast } from "./ui/use-toast"
import { Toaster } from "./ui/toast"

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()
  return <Toaster toasts={toasts} removeToast={removeToast} />
}

export { useToast }
