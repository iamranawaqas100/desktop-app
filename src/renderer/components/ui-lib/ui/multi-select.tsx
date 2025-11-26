"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Checkbox } from "./checkbox";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const displayText =
    value.length > 0 ? `${value.length} selected` : placeholder;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-left text-[#737373] transition-colors",
          "hover:bg-[#F7F7F7] focus:outline-none focus:ring-2 focus:ring-[#00D2A1] focus:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "border-[#00D2A1]"
        )}
        style={{ fontFamily: "Montserrat" }}
      >
        <span className="text-sm">{displayText}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-[#737373]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#737373]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#E5E5E5] bg-white shadow-lg">
          <div className="max-h-[300px] overflow-y-auto p-2">
            {options.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-sm text-[#737373]"
                style={{ fontFamily: "Montserrat" }}
              >
                No options available
              </div>
            ) : (
              options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors",
                      "hover:bg-[#F7F7F7]",
                      isSelected && "bg-[#F7F7F7]"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOption(option.value)}
                      className="pointer-events-none"
                    />
                    <span
                      className="flex-1 text-sm text-[#000000]"
                      style={{ fontFamily: "Montserrat" }}
                    >
                      {option.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
