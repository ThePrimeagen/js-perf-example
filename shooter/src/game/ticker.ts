import { Writer } from "./data-writer";

export function ticker(rate: number, writer: Writer) {
    let next = Date.now() + rate;
    let previousNow = 0;

    return function tickRunner() {
        const now = Date.now();
        const interval = now - previousNow;

        if (previousNow !== 0) {
            writer.write("tickInterval", interval);
            if (interval > rate + 1) {
                writer.count("tickIntervalOverrun");
            } else if (interval < Math.floor(rate - 1)) {
                writer.count("tickIntervalUnderrun");
            } else {
                writer.count("tickOnTime");
            }
        }

        let flooredNext = Math.floor(next);

        next = next + rate;
        previousNow = now;

        return flooredNext;
    }
}


type Callback = () => void;

class Timer {
    private lastTimeStamp: number;
    private cbs: Map<number, Callback[]>;
    private boundRun: () => void;

    static create() {
        const timer = new Timer();
        timer.run();
        return timer;
    }

    private constructor() {
        this.lastTimeStamp = Date.now();
        this.cbs = new Map();
        this.boundRun = this.run.bind(this);
    }

    private run() {
        const start = Date.now();

        while (this.lastTimeStamp < start) {
            const now = Date.now();
            if (now - start > 2) {
                break;
            }

            const cbs = this.cbs.get(this.lastTimeStamp);
            if (cbs) {
                for (const cb of cbs) {
                    cb();
                }
            }
            this.cbs.delete(this.lastTimeStamp++);
        }

        setTimeout(this.boundRun, 0);
    }

    add(cb: Callback, when: number) {
        let cbs = this.cbs.get(when);
        if (!cbs) {
            cbs = [];
            this.cbs.set(when, cbs);
        }
        cbs.push(cb);
    }
}

const timer = Timer.create();
export function getTimer() {
    return timer;
}

