"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui-lib/ui/button"
import { Input } from "./ui-lib/ui/input"
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react"

interface TitleBarProps {
  currentUrl: string
  onNavigate: (url: string) => void
  webviewRef: any
  onLogout: () => void
}

export default function TitleBar({ currentUrl, onNavigate, webviewRef, onLogout }: TitleBarProps) {
  const [urlInput, setUrlInput] = useState("")

  const handleBack = () => {
    if (webviewRef.current?.canGoBack()) {
      webviewRef.current.goBack()
    }
  }

  const handleForward = () => {
    if (webviewRef.current?.canGoForward()) {
      webviewRef.current.goForward()
    }
  }

  const handleRefresh = () => {
    webviewRef.current?.reload()
  }

  const handleNavigate = () => {
    if (urlInput) {
      let url = urlInput
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url
      }
      onNavigate(url)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNavigate()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E5E5E5]">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-[#00D2A1] flex items-center justify-center" aria-label="Collector Logo">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        <span
          className="font-semibold tracking-wide hidden md:block text-[#000000]"
          style={{ fontFamily: "Montserrat" }}
        >
          DataEssential
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          onClick={handleBack}
          variant="ghost"
          size="icon-sm"
          title="Back"
          className="hover:bg-[#F7F7F7] text-[#737373]"
        >
          <ArrowLeft size={18} />
        </Button>
        <Button
          onClick={handleForward}
          variant="ghost"
          size="icon-sm"
          title="Forward"
          className="hover:bg-[#F7F7F7] text-[#737373]"
        >
          <ArrowRight size={18} />
        </Button>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="icon-sm"
          title="Refresh"
          className="hover:bg-[#F7F7F7] text-[#737373]"
        >
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <Input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="www.mcdonalds.com"
          className="flex-1 rounded-lg border-[#E5E5E5] h-10"
          style={{ fontFamily: "Montserrat" }}
        />
        <Button
          onClick={handleNavigate}
          size="sm"
          className="bg-white hover:bg-[#F7F7F7] text-[#000000] border border-[#E5E5E5] rounded-lg px-4"
          style={{ fontFamily: "Montserrat" }}
        >
          Switch Source
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="text-sm text-[#000000] hidden md:block cursor-pointer hover:text-[#00D2A1]"
          style={{ fontFamily: "Montserrat" }}
        >
          Sign in / Sign up
        </span>
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-[#00D2A1] flex items-center justify-center">
            <span className="text-white text-sm font-bold">🛒</span>
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#DC2626] rounded-full flex items-center justify-center text-white text-xs font-bold">
            0
          </span>
        </div>
      </div>
    </div>
  )
}
