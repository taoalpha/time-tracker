import { ipcRenderer } from "electron";
import { ApplicationTimingMap } from "../types";
import {EventEmitter} from "./event-emitter";

export enum DataDuration {
  ALL = 0,
  ONE_DAY = 1,
  ONE_WEEK = 7,
  ONE_MONTH = 30,
  ONE_YEAR = 365,
}

declare global {
  interface Window {
    TIMING_DATA: Map<string, ApplicationTimingMap>;
    CHART_CONFIG: {
      __emitter__: EventEmitter; // event emitter
      showLegend?: boolean; // show / hide legend (auto hide by default if over 20 apps)
      duration: DataDuration; // default is all

      emit(...args: any[]): void;
      on(...args: any[]): void;
    };

    // listeners for clicks
    onClearStoreClick(): void;
    onRangeChange(event: Event): void;
  }
}

// dom event listeners
window.onClearStoreClick = () => {
  ipcRenderer.send("clear_store");
}

window.onRangeChange = (e: Event) => {
  e.stopPropagation();
  const el = e.target as HTMLElement;
  const range = el.getAttribute("data-value");
  if (range) {
    window.CHART_CONFIG.duration = parseInt(range);
  } else {
    window.CHART_CONFIG.duration = DataDuration.ALL;
  }

  // remove active on all items except current one
  let menuItem = el.parentNode.firstChild;
	while (menuItem) {
		if (menuItem.nodeType === 1 && menuItem !== el) {
      (menuItem as HTMLElement).classList.remove("active");
		}
		menuItem = menuItem.nextSibling
  }

  el.classList.add("active");

  window.CHART_CONFIG.emit("changed");
}