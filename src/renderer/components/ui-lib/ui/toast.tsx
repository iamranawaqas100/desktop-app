"use client";
import { X } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { ToastProps as ToastPropsType } from "./use-toast";

export function Toast({
  title,
  description,
  variant = "default",
  onClose,
}: Omit<ToastPropsType, "id"> & { onClose?: () => void }) {
  const variantStyles = {
    default: "bg-white border-[#E5E5E5]",
    success: "bg-white border-[#00D2A1]",
    error: "bg-white border-[#FF4D4F]",
    warning: "bg-white border-[#FF8D54]",
    info: "bg-blue-50 border-[#00B7B7]",
  };

  const iconColors = {
    default: "text-[#737373]",
    success: "text-[#00D2A1]",
    error: "text-[#FF4D4F]",
    warning: "text-[#FF8D54]",
    info: "text-[#00B7B7]",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border-2 p-4 shadow-lg transition-all",
        variantStyles[variant]
      )}
      style={{ fontFamily: "Montserrat" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title && (
            <div className="font-semibold text-foreground text-sm">{title}</div>
          )}
          {description && (
            <div className="text-sm text-[#737373] mt-1">{description}</div>
          )}
        </div>
        <button
          onClick={onClose}
          className={cn(
            "rounded-lg p-1 hover:bg-gray-100 transition-colors",
            iconColors[variant]
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Toaster({
  toasts,
  removeToast,
}: {
  toasts: ToastPropsType[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
