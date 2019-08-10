export class EventEmitter {
  events: {[key: string]: Array<() => void>} = {};

  emit(event: string, ...args: any[]) {
    (this.events[event] || []).forEach(cb => {
      cb.apply(null, args);
    });
  }

  on(event: string, cb: () => void) {
    (this.events[event] = this.events[event] || []).push(cb);

    return () => {
      this.events[event] = this.events[event].filter(listener => listener !== cb);
    };
  }
}

export function eventify(obj: any) {
  obj.__emitter__ = new EventEmitter();
  obj.emit = (...args: any[]) => obj.__emitter__.emit(...args);
  obj.on = (...args: any[]) => obj.__emitter__.on(...args);
  return obj;
}