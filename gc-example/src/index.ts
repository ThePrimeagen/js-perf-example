import data from "./data.json";
const {
    time,
    objectCount,
    timeToRun,
    random,
    pool,
} = data;

const objectsPerMS = objectCount / time;

console.log(
    "pool", pool,
    "time", time,
    "objectCount", objectCount,
    "timeToRun", timeToRun,
    "random", random,
    "objectPerMS", objectsPerMS,
);

class Pool<T> {
    available: T[] = [];
    pop(): T {
        if (this.available.length) {
            return this.available.pop()!;
        }
        return {} as T;
    }

    push(t: T) {
        this.available.push(t);
    }
}

class NoPool<T> {
    pop(): T {
        return {} as T;
    }

    push(t: T) { }
}

const createObj = pool ? new Pool<LLNode>() : new NoPool<LLNode>();

type LLNode = {
    created: number,
    data: number,
    next?: LLNode | undefined
}

let id = 0;

function createNode(tail?: LLNode): LLNode {
    const node = createObj.pop();
    node.created = Date.now();
    node.data = ++id;
    node.next = undefined;

    if (tail) {
        tail.next = node;
    }
    return node;
}

let tail: undefined | LLNode = undefined;
let head: undefined | LLNode = undefined;
const hist = new Map<number, number>();
let lastRun = 0;
let count = 0;

function empty(now: number) {
    while (head && (head.created + time < now || Math.random() < random)) {
        createObj.push(head);
        head = head.next;
        count--;
    }

    if (head === undefined) {
        tail = undefined;
    }
}

const start = Date.now();
function run() {
    const now = Date.now();
    const diff = now - (lastRun === 0 ? now : lastRun);
    if (start + timeToRun < now) {
        console.log(hist);
        console.log(createDistribution());
        process.exit(0);
    }
    empty(now);

    if (lastRun !== 0) {
        const diff = now - lastRun;
        hist.set(diff, (hist.get(diff) || 0) + 1);
    }
    lastRun = now;

    const startCount = count;
    do {
        tail = createNode(tail);
        count++;
    } while (count - startCount < objectsPerMS * diff);

    if (head === undefined) {
        head = tail;
    }

    setTimeout(run, 0);
}

run();

function createDistribution() {
    const keys = [...hist.keys()].map(x => +x).sort((a, b) => a - b);
    const out: number[] = [];
    for (const k of keys) {
        const count = hist.get(k)!;

        for (let i = 0; i < count; ++i) {
            out.push(k);
        }
    }

    // i don't think this is needed
    out.sort((a, b) => a - b);

    return {
        "0.01": out[Math.floor(out.length * 0.01)],
        "0.05": out[Math.floor(out.length * 0.05)],
        "0.1": out[Math.floor(out.length * 0.1)],
        "0.25": out[Math.floor(out.length * 0.25)],
        "0.5": out[Math.floor(out.length * 0.5)],
        "0.75": out[Math.floor(out.length * 0.75)],
        "0.9": out[Math.floor(out.length * 0.9)],
        "0.95": out[Math.floor(out.length * 0.95)],
        "0.99": out[Math.floor(out.length * 0.99)],
        "0.999": out[Math.floor(out.length * 0.999)],
    };
}
