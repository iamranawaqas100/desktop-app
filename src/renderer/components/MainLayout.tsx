import { useState, useEffect, useRef } from "react";
import { useExtractionStore } from "../store";
import TitleBar from "./TitleBar";
import DataPanel from "./DataPanel";
import BrowserView from "./BrowserView";

export default function MainLayout() {
  const [currentUrl, setCurrentUrl] = useState("");
  const webviewRef = useRef<any>(null);
  const extractedData = useExtractionStore((state) => state.extractedData);

  useEffect(() => {
    // Handle custom protocol (manual collection)
    const handleProtocol = (event: CustomEvent) => {
      const url = event.detail;
      console.log("🔗 Protocol URL received:", url);
      setCurrentUrl(url);
    };

    // Handle AI collection source URL
    const handleSourceUrl = (event: CustomEvent) => {
      const url = event.detail;
      console.log("🌐 AI Collection source URL received:", url);
      setCurrentUrl(url);
    };

    // Handle webview reset (clears current URL)
    const handleWebviewReset = () => {
      console.log("🧹 Webview reset event received - clearing URL");
      setCurrentUrl("");
    };

    window.addEventListener("open-url" as any, handleProtocol);
    window.addEventListener("open-source-url" as any, handleSourceUrl);
    window.addEventListener("reset-webview" as any, handleWebviewReset);

    return () => {
      window.removeEventListener("open-url" as any, handleProtocol);
      window.removeEventListener("open-source-url" as any, handleSourceUrl);
      window.removeEventListener("reset-webview" as any, handleWebviewReset);
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Header/Topbar */}
      <header className="border-b border-border bg-card backdrop-blur-sm">
        <TitleBar onNavigate={setCurrentUrl} webviewRef={webviewRef} />
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <BrowserView url={currentUrl} webviewRef={webviewRef} />
        <DataPanel />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm border-t border-border bg-card">
        <div className="flex items-center gap-4">
          <span id="statusMessage" className="text-muted-foreground">
            Ready to extract data
          </span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span id="extractionStats" className="font-medium text-primary">
            {extractedData.length} items extracted
          </span>
          <span>•</span>
          <span id="appVersion">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
