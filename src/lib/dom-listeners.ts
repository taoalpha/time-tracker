import { ipcRenderer } from "electron";
import { ApplicationTimingMap, TimingItem } from "../types";

declare global {
  interface Window {
    TIMING_DATA: Map<string, ApplicationTimingMap>;

    // listeners for clicks
    onClearStoreClick(): void;
  }
}

// dom event listeners
window.onClearStoreClick = function () {
  ipcRenderer.send("clear_store");
}