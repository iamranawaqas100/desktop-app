"use client"
import { Button } from "./ui/button"
import { ChevronDown, Upload } from "lucide-react"
import { cn } from "../../lib/utils"

export interface Source {
  id: string
  type: "pdf" | "url"
  value: string
  status: "idle" | "in-progress" | "completed" | "error"
  progress?: number
}

export interface RestaurantDetailProps {
  restaurantId: string
  restaurantName: string
  country: string
  collectionPeriod: string
  status: "pending" | "completed" | "in-progress"
  sources: Source[]
  onAddSource: () => void
  onRunAICollection: (sourceId: string) => void
  onRunManualCollection: (sourceId: string) => void
  onQCReview: () => void
}

export function RestaurantDetail({
  restaurantId,
  restaurantName,
  country,
  collectionPeriod,
  status,
  sources,
  onAddSource,
  onRunAICollection,
  onRunManualCollection,
  onQCReview,
}: RestaurantDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Restaurant Name: {restaurantName}</h1>
            <span
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold",
                status === "pending" && "bg-[#FF8D54] text-white",
                status === "completed" && "bg-[#00D2A1] text-white",
                status === "in-progress" && "bg-[#0494F7] text-white",
              )}
            >
              {status === "pending" && "Pending"}
              {status === "completed" && "Completed"}
              {status === "in-progress" && "In Progress"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium">Restaurant ID:</span> {restaurantId}
            </p>
            <p>
              <span className="font-medium">Country:</span> {country}
            </p>
            <p>
              <span className="font-medium">Collection Period:</span> {collectionPeriod}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-[#00D2A1] text-[#00D2A1] hover:bg-[#00D2A1]/10 bg-white h-11 px-6 rounded-lg font-medium"
          onClick={onQCReview}
        >
          QC / Review Items
        </Button>
      </div>

      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.id} className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <div className="grid gap-4 items-center" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
              {/* Source Info */}
              <div className="flex items-center gap-2">
                {source.type === "pdf" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span>{source.value}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{source.value}</div>
                )}
              </div>

              {/* Add Sources Button */}
              <Button
                onClick={onAddSource}
                className="bg-[#00D2A1] hover:bg-[#00b890] text-white h-10 px-5 rounded-lg font-medium"
              >
                Add Sources
              </Button>

              {/* Status/Action Button */}
              <div>
                {source.status === "idle" && (
                  <Button
                    className="bg-[#00D2A1] hover:bg-[#00b890] text-white h-10 px-5 rounded-lg font-medium"
                    onClick={() => onRunAICollection(source.id)}
                  >
                    Run AI Collection
                  </Button>
                )}
                {source.status === "in-progress" && (
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium text-[#0494F7]">In Progress - {source.progress}%</div>
                    <div className="w-36 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0494F7] transition-all" style={{ width: `${source.progress}%` }} />
                    </div>
                  </div>
                )}
                {source.status === "completed" && (
                  <Button
                    variant="outline"
                    className="border-[#00D2A1] text-[#00D2A1] hover:bg-[#00D2A1]/10 bg-white h-10 px-5 rounded-lg font-medium"
                  >
                    Completed
                  </Button>
                )}
                {source.status === "error" && (
                  <Button
                    className="bg-[#EF4444] text-white hover:bg-[#DC2626] h-10 px-5 rounded-lg font-medium"
                    onClick={() => onRunAICollection(source.id)}
                  >
                    Error - Try Again
                  </Button>
                )}
              </div>

              {/* Manual Collection Dropdown */}
              <Button
                variant="outline"
                className="gap-2 bg-white border-[#E5E5E5] hover:border-[#00D2A1] h-10 px-5 rounded-lg font-medium"
                onClick={() => onRunManualCollection(source.id)}
              >
                Run Manual Collection
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
