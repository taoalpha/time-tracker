// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { ipcRenderer } from "electron";
import * as Chart from "chart.js";
import { ApplicationTimingMap, TimingItem } from "../types";
import {getColor, jsonReviver, convertMS} from "./utils";
import {DataDuration} from "./dom-listeners";
import {eventify} from "./event-emitter";

const SpecialApps: {[key: string]: string} = {
  loginwindow: "Login Screen",
}

const ctx = (document.getElementById('myChart') as HTMLCanvasElement).getContext('2d');
let chart: Chart;

window.CHART_CONFIG = eventify({
  duration: DataDuration.ALL,
});

// when config changed, re-render
window.CHART_CONFIG.on("changed", cleanData);

window.TIMING_DATA = new Map<string, ApplicationTimingMap>();

let currentFocusedApp = "";

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
    onClick(_, chartEls) {
      if (!chartEls.length && !currentFocusedApp) return;
      if (!chartEls.length && currentFocusedApp) {
        // back to app page
        currentFocusedApp = "";
        cleanData();
        return;
      };
      const activeEl = chartEls[0] as any;

      // update to detail on this app
      currentFocusedApp = chart.data.labels[activeEl._index] as string;
      updateToDetail();
    }
  }
};

function updateToDetail() {
  const data: number[] = [];
  const colors: string[] = [];
  const labels: string[] = [];
  window.TIMING_DATA.get(currentFocusedApp).forEach((timingRecord, title) => {
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

  renderChart();
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

  renderChart();
}

function renderChart() {
  config.options.title.text = `Time usage${window.CHART_CONFIG.duration ? ` for past ${convertMS(window.CHART_CONFIG.duration * 86400000)}` : ""}` +
    `${currentFocusedApp ? ` within ${currentFocusedApp}` : ""}` +
    ` (total: ${convertMS((config.data.datasets[0].data as number[]).reduce((acc, cur) => acc + cur, 0))})`;
  config.options.legend.display = config.data.labels.length < 20;
 
  if (!chart) {
    chart = new Chart(ctx, config);
  }
  chart.update();
}

function getDuration(item: TimingItem) {
  if (window.CHART_CONFIG.duration !== DataDuration.ALL) {
    let duration = 0;
    const cDay = new Date();
    while ((new Date().getTime() - cDay.getTime())  < window.CHART_CONFIG.duration * 86400000) {
      const dateKey = cDay.toISOString().split("T")[0];
      if (item.intervals[dateKey]) {
        duration += item.intervals[dateKey].reduce((acc: number, cur: [number, number]) => acc + cur[1], 0);
      }
      // one day back
      cDay.setDate(cDay.getDate() - 1);
    }
    return duration;
  }

  // return all
  return Object.values(item.intervals).reduce((acc: number, intervals: Array<[number, number]>) => acc + intervals.reduce((acc: number, cur: [number, number]) => acc + cur[1], 0), 0);
}

// communication channel
ipcRenderer.on("timing", (_, timingInfo: string) => {
  currentFocusedApp = '';
  cleanData(JSON.parse(timingInfo, jsonReviver));
});