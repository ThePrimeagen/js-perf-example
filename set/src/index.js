const data = require("./data.json");

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

const strFnToUse = createString;

/**
 * @param {number} count
 * @param {number} charsUntil
 */
function randomCreateString(count, charsUntil) {
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

/**
 * @param {number} count
 * @param {number} charsUntil
 */
function createString(count, charsUntil) {
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

/**
 * @param {() => string} iter
 */
function findWithSet(iter) {
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

/**
 * @param {() => string} iter
 */
function findWithArray(iter) {
    /** @type {string[]} */
    let arr = []
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

/** @typedef {[number, number]} Run */
/**
 * @param {(gen: () => string) => number} gen
 * @return {Run[]}
 */
function run(fn) {
    /** @type {Run[]} */
    const runs = [];

    for (let i = 0; i < runCount; ++i) {
        const gen = strFnToUse(count, charsUntil);
        const start = Date.now();
        const c = fn(gen);
        const runtime = Date.now() - start;
        runs.push([runtime, c]);
    }

    return runs;
}

/** @param {number} x */
function round(x) {
    return Math.round(x * 1000) / 1000;
}

/**
 * @param {string} name
 * @param {Run[]} values
 * */
function printStats(name, values) {
    const [time, count] = values.reduce((acc, [time, count]) => {
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
