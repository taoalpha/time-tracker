// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { ipcRenderer } from "electron";
import * as Chart from "chart.js";
import { ApplicationTimingMap, TimingItem } from "../types";
import {getColor, jsonReviver} from "./utils";
import "./dom-listeners";

const SpecialApps: {[key: string]: string} = {
  loginwindow: "Login Screen",
}

const ctx = (document.getElementById('myChart') as HTMLCanvasElement).getContext('2d');
let chart: Chart;

window.TIMING_DATA = new Map<string, ApplicationTimingMap>();

function convertMS(milliseconds: number) {
  var day, hour, minute, seconds;
  seconds = Math.floor(milliseconds / 1000);
  minute = Math.floor(seconds / 60);
  seconds = seconds % 60;
  hour = Math.floor(minute / 60);
  minute = minute % 60;
  day = Math.floor(hour / 24);
  hour = hour % 24;

  return `${day ? day + ' d ' : ''}${hour ? hour + " h " : ""}${minute ? minute + " m " : ""}${seconds ? seconds + " s" : ""}`;
}

let isInDetail = false;

const config: Chart.ChartConfiguration = {
  type: 'doughnut',
  data: {},
  options: {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: 'Time usage'
    },
    legend: {
      display: true,
      position: 'top',
    },
    animation: {
      animateScale: true,
      animateRotate: true
    },
    tooltips: {
      callbacks: {
        label(tooltipItem: Chart.ChartTooltipItem, data: Chart.ChartData) {
          const points = data.datasets[tooltipItem.datasetIndex].data as number[];
          let label = data.labels[tooltipItem.index] || '';
          const value = points[tooltipItem.index];
          const sum = points.reduce((acc, cur) => acc + cur, 0);

          if (label) {
            label += ': ';
          }
          label += ((value / sum) * 100).toFixed(1) + " % (" + convertMS(value) + ")";
          return label;
        }
      }
    },
    onClick(event, chartEls) {
      if (!chartEls.length && !isInDetail) return;
      if (!chartEls.length && isInDetail) {
        // back to app page
        isInDetail = false;
        config.options.legend = { display: true };
        config.options.title.text = "Time usage";

        cleanData();
        return;
      };
      const activeEl = chartEls[0] as any;

      // update to detail on this app
      updateToDetail(chart.data.labels[activeEl._index] as string);
      isInDetail = true;
    }
  }
};

function updateToDetail(app: string) {
  const data: number[] = [];
  const colors: string[] = [];
  const labels: string[] = [];
  window.TIMING_DATA.get(app).forEach((timingRecord, title) => {
    data.push(getDuration(timingRecord));
    colors.push(getColor(title));
    labels.push(title);
  });

  config.data = {
    datasets: [{
      data,
      backgroundColor: colors,
    }],
    labels,
  }

  config.options.title.text = "Time usage within " + app;

  // config.type = "horizontalBar";
  config.options.legend = { display: false };

  if (!chart) {
    chart = new Chart(ctx, config);
  }
  chart.update();
}

function cleanData(timingInfo = window.TIMING_DATA) {
  window.TIMING_DATA = timingInfo;
  const data: number[] = [];
  const colors: string[] = [];
  const labels: string[] = [];
  window.TIMING_DATA.forEach((timingMap, app) => {
    // ignore some special apps: loginwindow
    if (!SpecialApps[app]) {
      data.push([...timingMap.values()].reduce((acc, cur) => acc + getDuration(cur), 0));
      colors.push(getColor(app));
      labels.push(app);
    }
  });

  config.data = {
    datasets: [{
      data,
      backgroundColor: colors,
    }],
    labels,
  }

  if (!chart) {
    chart = new Chart(ctx, config);
  }
  chart.update();
}

function getDuration(item: TimingItem, date?: string) {
  if (date) {
    return item.intervals[date].reduce((acc: number, cur: [number, number]) => acc + cur[1], 0);
  }

  // return all
  return Object.values(item.intervals).reduce((acc: number, intervals: Array<[number, number]>) => acc + intervals.reduce((acc: number, cur: [number, number]) => acc + cur[1], 0), 0);
}

// communication channel
ipcRenderer.on("timing", (_, timingInfo: string) => {
  isInDetail = false;
  config.options.legend = { display: true };
  config.options.title.text = "Time usage";
  cleanData(JSON.parse(timingInfo, jsonReviver));
});