import data from "./data.json";
const {
    low,
    high,
    style,
} = data.ring;

class StandardPool<T> {
    private pool: T[];
    constructor(private ctr: () => T) {
        this.pool = [];
    }

    get(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }

        return this.ctr();
    }

    put(item: T) {
        this.pool.push(item);
    }
}

class RingPool<T> {
    private pool: (T | undefined)[];
    private startIdx: number;
    private endIdx: number;
    constructor(private ctr: () => T) {
        this.pool = new Array(10).fill(undefined);
        this.startIdx = 0;
        this.endIdx = 0;
    }

    get(): T {
        if (this.startIdx === this.endIdx) {
            return this.ctr();
        }

        const item = this.pool[this.startIdx];
        this.pool[this.startIdx] = undefined;
        this.startIdx += (this.startIdx + 1) % this.pool.length;

        return item!;
    }

    put(item: T) {
        if (this.startIdx === this.endIdx) {
            this.resize();
        }
        this.pool[this.endIdx] = item;
        this.endIdx++;
    }

    private resize() {
        const newPool = new Array(this.pool.length * 2).fill(undefined);
        const nextEndIdx = this.pool.length;
        for (let i = 0; i < this.pool.length; ++i) {
            newPool[i] = this.pool[(this.startIdx + i) % this.pool.length];
        }
        this.pool = newPool;
        this.startIdx = 0;
        this.endIdx = nextEndIdx;
    }
}

function ctr(): Record<string, string> {
    return {};
};

const pool = style === "ring" ? new RingPool(ctr) : new StandardPool(ctr);

function rand(): number {
    const diff = high - low;

    return low + Math.floor(Math.random() * diff);
}

const objs: Record<string, string>[] = [];
const startTime = Date.now();
const timeToTake = process.argv[2] ? +process.argv[2] : 5000;

let objectsAdded = 0;
let objectsRemoved = 0;
while (Date.now() - startTime < timeToTake) {
    const release = rand();
    objectsRemoved += Math.min(release, objs.length);

    for (let i = 0; i < release && objs.length > 0; ++i) {
        pool.put(objs.pop()!);
    }

    const create = rand();
    objectsAdded += create;

    for (let i = 0; i < create; ++i) {
        objs.push(pool.get());
    }
}

console.log("Objects added: ", objectsAdded);
console.log("Objects removed: ", objectsRemoved);
