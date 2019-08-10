import * as path from "path";

import { app, ipcMain, globalShortcut, Menu } from "electron";
import { menubar } from "menubar";
import * as Store from "electron-store";

import * as activeWin from 'active-win';
import {ApplicationTimingMap, TimingItem} from "./types";
import {jsonReplacer, jsonReviver} from "./lib/utils";

const store = new Store<Map<string,ApplicationTimingMap>>({
  serialize(value: any) {
    // minimize
    return JSON.stringify(value, jsonReplacer);
  },
  deserialize(value: string) {
    return JSON.parse(value, jsonReviver);
  }
});

const TIMING_DATA_STORE = store.get("timingInfo") || new Map<string, ApplicationTimingMap>(); 

let last_entry: TimingItem;

const mb = menubar({
  icon: path.join(__dirname, "/icon.png"),
  showDockIcon: false,
  preloadWindow: true,
  dir: path.join(__dirname, ".."),
  browserWindow: {
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
    }
  }
});

// keep polling current active window
setInterval(() => {
  activeWin().then(res => {
    if (!res) return;
    TIMING_DATA_STORE.set(res.owner.name, TIMING_DATA_STORE.get(res.owner.name) || new Map<string, TimingItem>());
    let appData = TIMING_DATA_STORE.get(res.owner.name);
    let date = new Date().toISOString().split("T")[0];

    // record data to window
    if (!last_entry) {
      // first time
      appData.set(res.title, {
        app: res.owner.name,
        title: res.title,
        path: res.owner.path,
        intervals: {
          [date]: [[Date.now(), 0]],
        }
      });
      last_entry = appData.get(res.title);
    } else if (last_entry.app === res.owner.name && last_entry.title === res.title) {
      // same app && same title
      // update the duration
      last_entry.intervals[date] = last_entry.intervals[date] || [[Date.now(), 0]];
      let last_interval = last_entry.intervals[date].pop();
      last_interval[1] = Date.now() - last_interval[0];
      last_entry.intervals[date].push(last_interval);
    } else {
      // different app or different title
      // complete last entry
      last_entry.intervals[date] = last_entry.intervals[date] || [[Date.now(), 0]];
      let last_interval = last_entry.intervals[date].pop();
      last_interval[1] = Date.now() - last_interval[0];
      last_entry.intervals[date].push(last_interval);

      // same title exists
      // start with a new interval
      if (appData.has(res.title)) {
        const itemData = appData.get(res.title);
        itemData.intervals[date] = itemData.intervals[date] || [];
        itemData.intervals[date].push([Date.now(), 0]);
      } else {
        appData.set(res.title, {
          app: res.owner.name,
          title: res.title,
          path: res.owner.path,
          intervals: {
            [date]: [[Date.now(), 0]],
          }
        });
      }

      last_entry = appData.get(res.title);
    }
  }).then(() => store.set("timingInfo", TIMING_DATA_STORE)).catch(console.log);
}, 1000);

function toggleWindow() {
  mb.window.isVisible() ? mb.hideWindow() : mb.showWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
mb.on("ready", function ready() {
  globalShortcut.register(
    'Cmd+`',
    toggleWindow
  );
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// send data to renderer
mb.on("show", async () => {
  // Open the DevTools.
  // mb.window.webContents.openDevTools();
  mb.window.webContents.send("timing", JSON.stringify(TIMING_DATA_STORE, jsonReplacer));
});

ipcMain.on('sync_timing', (event, arg) => {
  event.returnValue = TIMING_DATA_STORE;
});

ipcMain.on("clear_store", () => {
  TIMING_DATA_STORE.clear();
  store.set("timingInfo", TIMING_DATA_STORE);
  mb.window.webContents.send("timing", TIMING_DATA_STORE);
});