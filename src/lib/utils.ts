function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
     hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
} 

function intToRGB(i: number) {
  const c = (i & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();

  return "#" + "00000".substring(0, 6 - c.length) + c;
}

export function getColor(str: string) {
  return intToRGB(hashCode(str));
}

export function jsonReplacer(key: string, value: any) {
  if(value instanceof Map) {
      return {_type: "map", _value: [...value]};
  } else if(value instanceof Set) {
      return {_type: "set", _value: [...value]};
  }
  return value;
}

export function jsonReviver(key: string, value: any) {
  if (value !== null && typeof value === "object" && value._type && value._value) {
    if (value._type === "set") {
      return new Set(value._value);
    } else if (value._type === "map") {
      return new Map(value._value);
    }
  }
  return value;
}

export function convertMS(milliseconds: number) {
  let year, month, week, day, hour, minute, seconds;
  seconds = Math.floor(milliseconds / 1000);
  minute = Math.floor(seconds / 60);
  seconds = seconds % 60;
  hour = Math.floor(minute / 60);
  minute = minute % 60;
  day = Math.floor(hour / 24);
  hour = hour % 24;

  year = Math.floor(day / 365);
  day = day % 365;
  month = Math.floor(day / 30);
  day = day % 30;
  week = Math.floor(day / 7);
  day = day % 7;

  return `${year ? year + ' y ' : ''}${month ? month + ' m ' : ''}${week ? week + ' w ' : ''}` +
    `${day ? day + ' d ' : ''}${hour ? hour + " h " : ""}${minute ? minute + " m " : ""}${seconds ? seconds + " s" : ""}`;
}