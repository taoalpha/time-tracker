export type ApplicationTimingMap = Map<string, TimingItem>;

export interface TimingItem {
  // meta info
  app: string;
  title: string;
  path: string;

  // range
  intervals: {
    // date - intervals
    [key: string]: Array<[number, number]>;
  },
}