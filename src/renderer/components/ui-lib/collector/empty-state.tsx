"use client"

export function CollectorEmptyState() {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-16 text-center">
      <h3 className="text-2xl font-semibold mb-3 text-foreground">Ops, Nothing to collect yet!</h3>
      <p className="text-base text-muted-foreground max-w-lg mx-auto">
        No restaurant assignments are currently available. Please contact your supervisor to receive new assignments.
      </p>
    </div>
  )
}
