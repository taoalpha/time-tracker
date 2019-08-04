import * as path from "path";

import { app, ipcMain, globalShortcut, Menu } from "electron";
import { menubar } from "menubar";
import * as Store from "electron-store";

import * as activeWin from 'active-win';
import {ApplicationTiming, TimingItem} from "./types";

const store = new Store({
  serialize(value: any) {
    // minimize
    return JSON.stringify(value);
  }
});
const timingInfo: {[key: string]: ApplicationTiming} = store.get("timingInfo") as any || {};

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
    timingInfo[res.owner.name] = timingInfo[res.owner.name] || {};
    let appData = timingInfo[res.owner.name];
    let date = new Date().toISOString().split("T")[0];

    // record data to window
    if (!last_entry) {
      // first time
      appData[res.title] = {
        app: res.owner.name,
        title: res.title,
        path: res.owner.path,
        intervals: {
          [date]: [[Date.now(), 0]],
        }
      };
      last_entry = appData[res.title];
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
      if (appData[res.title]) {
        appData[res.title].intervals[date].push([Date.now(), 0]);
      } else {
        appData[res.title] = {
          app: res.owner.name,
          title: res.title,
          path: res.owner.path,
          intervals: {
            [date]: [[Date.now(), 0]],
          }
        };
      }

      last_entry = appData[res.title];
    }
  }).then(() => store.set("timingInfo", timingInfo)).catch(console.log);
}, 1000);

function toggleWindow() {
  mb.window.isVisible() ? mb.hideWindow() : mb.showWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
mb.on("ready", function ready() {
  // mb.window.webContents.toggleDevTools();
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
  mb.window.webContents.send("timing", timingInfo);
});

ipcMain.on('sync-timing', (event, arg) => {
  event.returnValue = timingInfo;
});