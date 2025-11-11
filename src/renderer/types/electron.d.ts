declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      openDashboard: () => Promise<void>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
      send: (channel: string, data?: any) => void; // Added send method
    };
    api: any; // Main API interface (already defined elsewhere)
  }
}

export {};