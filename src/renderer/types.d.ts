declare module "*.css";
declare module "*.png";
declare module "*.jpg";
declare module "*.svg";

interface Window {
  electronAPI: {
    getExtractedData: (context?: any) => Promise<any[]>;
    saveExtractedData: (data: any, context: any) => Promise<any>;
    updateExtractedData: (id: string | number, data: any) => Promise<void>;
    deleteExtractedData: (id: string | number) => Promise<void>;
    verifyAIItem: (
      aiItemId: string,
      collectorId: string,
      updates?: any
    ) => Promise<any>;
    exportData: (
      format: string
    ) => Promise<{ success: boolean; count: number; path?: string }>;
    getAppVersion: () => Promise<string>;
    getApiUrl: () => Promise<string>;
    isDevMode: () => Promise<boolean>;
    onProtocolUrl: (callback: (url: string) => void) => void;
    onProtocolExtract: (callback: (event: any, data: any) => void) => void;
    onMenuNewExtraction: (callback: () => void) => void;
    onMenuExportData: (callback: () => void) => void;
    onMenuClearData: (callback: () => void) => void;
    onAuthCallback: (callback: (data: any) => void) => void;
    onAICollectionCallback: (callback: (data: any) => void) => void;
    openExternal: (url: string) => Promise<{ success: boolean }>;
    saveManualMenuItems: (data: {
      items: any[];
      authToken: string;
      apiUrl?: string;
    }) => Promise<{
      success: boolean;
      count: number;
      results: any[];
      errors?: any[];
    }>;
    getCollectionContext: (data: {
      restaurantId: string;
      authToken: string;
      apiUrl?: string;
    }) => Promise<{
      success: boolean;
      context: any;
    }>;
    getAssetPath: (assetName: string) => Promise<string>;
    onViewAIMenu: (callback: (data: any) => void) => void;
  };
}

declare module "electron" {
  interface WebviewTag extends HTMLElement {
    src: string;
    executeJavaScript: (script: string) => Promise<any>;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: any;
  }
}
