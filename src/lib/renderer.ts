// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { ipcRenderer } from "electron";
import * as Chart from "chart.js";
import 'chartjs-plugin-labels';
import { ApplicationTiming, TimingItem } from "../types";

const ctx = (document.getElementById('myChart') as HTMLCanvasElement).getContext('2d');
let chart: Chart;
let timingData: { [key: string]: ApplicationTiming } = {};

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
    plugins: {
      labels: {
        render: 'label',
      }
    },
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
        cleanData(timingData);
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
  Object.keys(timingData[app]).forEach(title => {
    data.push(getDuration(timingData[app][title]));
    colors.push(getRandomColor());
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
  config.options.legend = {display: false};

  if (!chart) {
    chart = new Chart(ctx, config);
  }
  chart.update();
}

function cleanData(timingInfo: { [key: string]: ApplicationTiming }) {
  timingData = timingInfo;
  const data: number[] = [];
  const colors: string[] = [];
  const labels: string[] = [];
  Object.keys(timingInfo).forEach(app => {
    data.push(Object.values(timingInfo[app]).reduce((acc, cur) => acc + getDuration(cur), 0));
    colors.push(getRandomColor());
    labels.push(app);
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

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getDuration(item: TimingItem, date?: string) {
  if (date) {
    return item.intervals[date].reduce((acc: number, cur: [number, number]) => acc + cur[1], 0);
  }

  // return all
  return Object.values(item.intervals).reduce((acc: number, intervals: Array<[number, number]>) => acc + intervals.reduce((acc: number, cur: [number, number]) => acc + cur[1], 0), 0);
}

ipcRenderer.on("timing", (event, arg) => {
  cleanData(arg);
  isInDetail = false;
  config.options.legend = { display: true };
  config.options.title.text = "Time usage";
});