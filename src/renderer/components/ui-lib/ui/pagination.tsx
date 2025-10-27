"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react"
import { Button } from "./button"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPage?: boolean
  itemsPerPageOptions?: number[]
  className?: string
  useUrlParams?: boolean // NEW: Enable URL sync
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  itemsPerPageOptions = [10, 25, 50, 100],
  className = "",
  useUrlParams = false,
}: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("...")
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const updateUrl = (page: number, limit?: number) => {
    if (!useUrlParams) return

    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    if (limit !== undefined) {
      params.set("limit", limit.toString())
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      if (useUrlParams) {
        updateUrl(page)
      }
      onPageChange(page)
    }
  }

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10)
    if (onItemsPerPageChange && !isNaN(newItemsPerPage)) {
      if (useUrlParams) {
        updateUrl(1, newItemsPerPage)
      }
      onItemsPerPageChange(newItemsPerPage)
      // Reset to page 1 when changing items per page
      onPageChange(1)
    }
  }

  if (totalPages <= 1 && !showItemsPerPage) {
    return null // Don't show pagination if only one page and no items per page selector
  }

  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap ${className}`}>
      {/* Left: Items info */}
      <div className="text-sm text-muted-foreground" style={{ fontFamily: "Montserrat" }}>
        Showing <span className="font-medium">{startItem}</span> to{" "}
        <span className="font-medium">{endItem}</span> of{" "}
        <span className="font-medium">{totalItems}</span> items
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <div key={`ellipsis-${index}`} className="flex items-center justify-center h-9 w-9">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
            )
          }

          const pageNumber = page as number
          return (
            <Button
              key={pageNumber}
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNumber)}
              className="h-9 w-9 p-0"
              style={{ fontFamily: "Montserrat" }}
            >
              {pageNumber}
            </Button>
          )
        })}

        {/* Next page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Items per page */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap" style={{ fontFamily: "Montserrat" }}>
            Items per page:
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(e.target.value)}
            className="h-9 px-3 py-1 text-sm border rounded-md bg-background"
            style={{ fontFamily: "Montserrat" }}
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// Hook for managing pagination state with URL sync
export function usePagination<T>(
  items: T[], 
  initialItemsPerPage: number = 10,
  useUrlParams: boolean = false
) {
  const searchParams = useSearchParams()
  
  // Initialize from URL params if enabled
  const urlPage = useUrlParams ? parseInt(searchParams.get("page") || "1", 10) : 1
  const urlLimit = useUrlParams ? parseInt(searchParams.get("limit") || initialItemsPerPage.toString(), 10) : initialItemsPerPage
  
  const [currentPage, setCurrentPage] = React.useState(urlPage)
  const [itemsPerPage, setItemsPerPage] = React.useState(urlLimit)

  // Sync with URL params when they change
  React.useEffect(() => {
    if (useUrlParams) {
      const newPage = parseInt(searchParams.get("page") || "1", 10)
      const newLimit = parseInt(searchParams.get("limit") || initialItemsPerPage.toString(), 10)
      
      if (newPage !== currentPage) setCurrentPage(newPage)
      if (newLimit !== itemsPerPage) setItemsPerPage(newLimit)
    }
  }, [searchParams, useUrlParams, initialItemsPerPage])

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = items.slice(startIndex, endIndex)

  // Reset to page 1 if current page exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page
  }

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems,
    totalItems: items.length,
    handlePageChange,
    handleItemsPerPageChange,
    setCurrentPage,
    setItemsPerPage,
  }
}
