/**
 * Audit Logging Service for Desktop App
 * Logs all collector actions to backend for transparency and debugging
 */

import { apiClient } from "./api-client";

export interface AuditLogParams {
    menuItemId: string; // AI Item ID or Manual Item ID
    itemType: "ai" | "manual";
    operation: "create" | "update" | "delete" | "verify" | "unverify";

    // For field updates
    fieldName?: string;
    oldValue?: string | number | boolean | null;
    newValue?: string | number | boolean | null;

    // For batch updates
    changes?: Record<string, any>;

    // Context
    sourceId?: string;
    notes?: string;
}

/**
 * Log an audit event
 * Non-blocking: failures are logged but don't interrupt user workflow
 */
export async function logAuditEvent(
    params: AuditLogParams,
    userContext: {
        userId: string;
        userRole: string;
        userName: string;
        collectionRestaurantId?: string;
    }
): Promise<void> {
    try {
        await apiClient.post("/v1/audit-logs", {
            menuItemId: params.menuItemId,
            itemType: params.itemType,
            userId: userContext.userId,
            userRole: userContext.userRole,
            userName: userContext.userName,
            operation: params.operation,
            fieldName: params.fieldName,
            oldValue: params.oldValue !== undefined ? String(params.oldValue) : undefined,
            newValue: params.newValue !== undefined ? String(params.newValue) : undefined,
            changes: params.changes,
            collectionRestaurantId: userContext.collectionRestaurantId,
            sourceId: params.sourceId,
            qcStage: "qc1", // Always qc1 for collector actions
            notes: params.notes,
            ipAddress: window.location.hostname, // Desktop app IP
            userAgent: navigator.userAgent,
        });

        console.log("[Audit] Logged:", params.operation, params.menuItemId);
    } catch (error) {
        // Log to console but don't throw - audit logging failures shouldn't block workflow
        console.error("[Audit] Failed to log event:", error);
    }
}

/**
 * Helper: Log field update
 */
export async function logFieldUpdate(
    itemId: string,
    itemType: "ai" | "manual",
    fieldName: string,
    oldValue: any,
    newValue: any,
    userContext: {
        userId: string;
        userRole: string;
        userName: string;
        collectionRestaurantId?: string;
    }
): Promise<void> {
    return logAuditEvent(
        {
            menuItemId: itemId,
            itemType,
            operation: "update",
            fieldName,
            oldValue,
            newValue,
        },
        userContext
    );
}
