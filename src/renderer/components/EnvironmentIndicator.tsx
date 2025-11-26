import { useUrlStore } from "../store";

export default function EnvironmentIndicator() {
  const { isLocalhost } = useUrlStore();

  return (
    <div className="fixed bottom-2 right-2 z-40 flex items-center gap-1.5 px-2 py-1 rounded-md bg-card/90 backdrop-blur-sm border border-border/50 shadow-sm text-xs">
      <div
        className={`h-1.5 w-1.5 rounded-full ${
          isLocalhost ? "bg-green-500" : "bg-blue-500"
        }`}
      />
      <span className="font-medium text-foreground">
        {isLocalhost ? "Local" : "QA"}
      </span>
      <span className="text-[10px] text-muted-foreground hidden sm:inline">
        (Ctrl+Shift+S)
      </span>
    </div>
  );
}
