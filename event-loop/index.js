
function tick() {
    return new Promise(res => res());
}

function print(hello) {
    return function() {
        console.log(hello);
    };
}

function addToNextTick(cb) {
    return function() {
        return new Promise(res => {
            res();
        }).then(cb);
    }
}

function promiseTiming() {
    return new Promise(res => {
        console.log("promise constructor");
        res();
    });
}

const h1 = addToNextTick(print("hello"));

async function main() {

    console.log("Constructor test");
    promiseTiming().then(() => console.log("promise then"));
    console.log("after promise constructor");

    await tick();

    console.log();
    console.log("--------------------");
    console.log();

    console.log("Promise Timing Test");
    for (let i = 0; i < 10; i++) {
        h1();
    }
    promiseTiming();
}

main();
