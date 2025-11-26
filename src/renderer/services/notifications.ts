/**
 * Simple Notification System for Desktop App
 * Polls backend for notifications and displays them
 */

import { apiClient } from "./api-client";

export interface Notification {
    _id: string;
    type: "SNAPSHOT_REJECTED" | "SNAPSHOT_APPROVED" | "GENERAL";
    title: string;
    message: string;
    data?: {
        collectionRestaurantId?: string;
        rejectionNotes?: string;
        snapshotId?: string;
    };
    read: boolean;
    createdAt: Date;
}

/**
 * Fetch notifications for current user
 */
export async function fetchNotifications(): Promise<Notification[]> {
    try {
        const response = await apiClient.get<{ success: boolean; notifications: Notification[] }>(
            "/api/notifications"
        );

        if (response.success) {
            return response.notifications;
        }

        return [];
    } catch (error) {
        console.error("[Notifications] Failed to fetch:", error);
        return [];
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
    try {
        await apiClient.patch(`/api/notifications/${notificationId}`, {
            read: true,
        });
    } catch (error) {
        console.error("[Notifications] Failed to mark as read:", error);
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
    try {
        const notifications = await fetchNotifications();
        return notifications.filter((n) => !n.read).length;
    } catch (error) {
        console.error("[Notifications] Failed to get unread count:", error);
        return 0;
    }
}
