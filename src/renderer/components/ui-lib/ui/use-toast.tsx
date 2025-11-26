"use client";

import * as React from "react";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
}

type ToastActionType =
  | { type: "ADD_TOAST"; toast: ToastProps }
  | { type: "REMOVE_TOAST"; id: string };

const toastReducer = (
  state: ToastProps[],
  action: ToastActionType
): ToastProps[] => {
  switch (action.type) {
    case "ADD_TOAST":
      return [...state, action.toast];
    case "REMOVE_TOAST":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
};

const ToastContext = React.createContext<{
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, "id">) => void;
  removeToast: (id: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = React.useReducer(toastReducer, []);

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 5000;

    dispatch({ type: "ADD_TOAST", toast: { ...toast, id } });

    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: "REMOVE_TOAST", id });
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
