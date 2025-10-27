"use client"

import * as React from "react"
import { signIn } from "next-auth/react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "../../lib/utils"
import { useToast } from "./ui/use-toast"

interface LoginFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LoginForm({ className, style, ...props }: LoginFormProps) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [rememberMe, setRememberMe] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      })

      if (result?.error) {
        addToast({
          title: "Authentication Failed",
          description: "Invalid email or password. Please try again.",
          variant: "error",
          duration: 5000,
        })
        setIsLoading(false)
      } else if (result?.ok) {
        addToast({
          title: "Welcome Back!",
          description: "Signing you in...",
          variant: "success",
          duration: 2000,
        })
        setTimeout(() => {
          window.location.href = "/"
        }, 1000)
      }
    } catch (err) {
      addToast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "error",
        duration: 5000,
      })
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn("w-full max-w-[720px] bg-white p-6 sm:p-8 md:p-10 lg:p-12", className)}
      style={{
        borderRadius: "48px",
        boxShadow: "8px 8px 49.5px 10px rgba(0, 0, 0, 0.05)",
        ...style,
      }}
      {...props}
    >
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground" style={{ fontFamily: "Montserrat" }}>
          Sign In
        </h1>
        <p className="text-sm sm:text-base text-[#737373] mt-1 sm:mt-2" style={{ fontFamily: "Montserrat" }}>
          Enter your credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground" style={{ fontFamily: "Montserrat" }}>
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-11 sm:h-12 md:h-14 bg-white border border-[#E5E5E5] text-sm sm:text-base"
            style={{
              borderRadius: "12px",
              fontFamily: "Montserrat",
            }}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
            style={{ fontFamily: "Montserrat" }}
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 sm:h-12 md:h-14 bg-white border border-[#E5E5E5] pr-10 sm:pr-12 text-sm sm:text-base"
              style={{
                borderRadius: "12px",
                fontFamily: "Montserrat",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#737373] hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 sm:pt-2 gap-2 flex-wrap">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="border-[#00D2A1] data-[state=checked]:bg-[#00D2A1] data-[state=checked]:border-[#00D2A1]"
              style={{ borderRadius: "4px" }}
            />
            <label
              htmlFor="remember"
              className="text-xs sm:text-sm text-foreground cursor-pointer select-none"
              style={{ fontFamily: "Montserrat" }}
            >
              Remember Me
            </label>
          </div>
          <a
            href="/forgot-password"
            className="text-xs sm:text-sm text-[#00D2A1] hover:underline font-medium transition-colors"
            style={{ fontFamily: "Montserrat" }}
          >
            Forgot Password?
          </a>
        </div>

        <Button
          type="submit"
          className="w-full h-11 sm:h-12 md:h-14 bg-[#00D2A1] hover:bg-[#00b890] text-white font-semibold text-sm sm:text-base transition-colors mt-6 sm:mt-8"
          style={{
            borderRadius: "12px",
            fontFamily: "Montserrat",
          }}
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  )
}
