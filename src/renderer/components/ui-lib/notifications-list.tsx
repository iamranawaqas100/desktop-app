"use client"

import { Checkbox } from "./ui/checkbox"
import { Button } from "./ui/button"
import { cn } from "../../lib/utils"

export interface Notification {
  id: string
  type: "success" | "warning" | "info"
  title: string
  restaurantName: string
  timestamp: string
  read: boolean
}

export interface NotificationsListProps {
  notifications: Notification[]
  onMarkAllRead: () => void
  onNotificationClick: (id: string) => void
}

export function NotificationsList({ notifications, onMarkAllRead, onNotificationClick }: NotificationsListProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground">Notifications</h1>
        <div className="flex items-center gap-2">
          <Checkbox
            id="mark-all"
            onCheckedChange={onMarkAllRead}
            className="border-[#00D2A1] data-[state=checked]:bg-[#00D2A1]"
          />
          <label htmlFor="mark-all" className="text-sm font-medium cursor-pointer text-foreground">
            Mark all as read
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "rounded-2xl border border-[#E5E5E5] bg-white p-6 transition-colors",
              !notification.read && "bg-[#F6F6F6]",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                {/* Status Indicator */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full mt-1.5",
                    notification.type === "success" && "bg-[#00D2A1]",
                    notification.type === "warning" && "bg-[#FF8D54]",
                    notification.type === "info" && "bg-[#0494F7]",
                  )}
                />

                {/* Content */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-foreground">{notification.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {notification.restaurantName} • {notification.timestamp}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => onNotificationClick(notification.id)}
                className="bg-[#00D2A1] hover:bg-[#00b890] text-white h-11 px-8 rounded-xl font-medium"
              >
                {notification.type === "success" ? "View" : "Open"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
