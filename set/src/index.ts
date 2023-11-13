import data from "./data.json";

let {
    count,
    runCount,
    charsUntil,
} = data;

// @ts-ignore
if (process.argv[2]) {
// @ts-ignore
    count = +process.argv[2];
}

const str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+[{(&=)}]*!|`%#\\";
console.log("max", str.length);

function randomCreateString(count: number, charsUntil: number) {
    let substr = str.substring(0, count - 1);
    let noRepeat = str.substring(0, count);

    let i = 0;
    let innerCount = 0;
    let rand = Math.floor(Math.random() * count - 1);

    return function() {
        i++;
        innerCount++;
        if (i < charsUntil) {
            if (innerCount === rand) {
                innerCount = 0;
                rand = Math.floor(Math.random() * count - 1);
            }
            return substr[innerCount];
        } else {
            return noRepeat[i % count];
        }
    };
}

function createString(count: number, charsUntil: number) {
    let substr = str.substring(0, count - 1);
    let noRepeat = str.substring(0, count);

    let i = 0;

    return function() {
        i++;
        if (i < charsUntil) {
            return substr[i % (count - 1)];
        } else {
            return noRepeat[i % count];
        }
    };
}

function findWithSet(iter: () => string) {
    let set = new Set()
    let runs = 0;
    let resets = 0;
    let sizeOnReset = 0;

    while (set.size < count) {
        runs++;
        const char = iter();
        const len = set.size;

        set.add(char);
        if (set.size === len) {
            sizeOnReset += set.size;
            resets++;
            set = new Set();
            set.add(char);
        }
    }

    return runs;
}

function findWithArray(iter: () => string) {
    let arr: string[] = []
    let runs = 0;
    let resets = 0;
    let sizeOnReset = 0;

    while (arr.length < count) {
        runs++;
        const char = iter();
        if (arr.includes(char)) {
            sizeOnReset += arr.length;
            arr = [];
            resets++;
        }

        arr.push(char);
    }

    return runs;
}

function run(fn: (gen: () => string) => number): [number, number][] {
    const runs: [number, number][] = [];

    for (let i = 0; i < runCount; ++i) {
        const gen = createString(count, charsUntil);
        const start = Date.now();
        const c = fn(gen);
        const runtime = Date.now() - start;
        runs.push([runtime, c]);
    }

    return runs;
}

function round(x: number) {
    return Math.round(x * 1000) / 1000;
}

function printStats(name: string, values: [number, number][]) {
    const [time, count] = values.reduce<[number, number]>((acc, [time, count]) => {
        acc[0] += time;
        acc[1] += count;
        return acc;
    }, [0, 0]);

    console.log(name, "total time", time, "total runs", count, "runs / time", round(count / time));
}

function runAll() {
    printStats("set", run(findWithSet));
    printStats("arr", run(findWithArray));
}

runAll();
