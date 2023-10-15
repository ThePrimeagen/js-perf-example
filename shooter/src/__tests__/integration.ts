import { spawn, execSync } from "child_process";
import { PlayerState } from "../game/game";

const kills: any[] = [];

async function* spawnChild(cmd: string, closeOnError: boolean = false) {
    let closed: boolean = false;
    let child = spawn(cmd, {
        cwd: process.cwd(),
        shell: true,
        stdio: ["pipe", "pipe", "pipe"]
    });

    kills.push(child);

    child.stdout.setEncoding("utf8");
    child.stdout.on("close", () => closed = true);

    function next(): Promise<string> {
        return new Promise(res => {
            child.stdout.once("data", function(data) {
                res(data.toString());
            });
        });
    }

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", function(data) {
        if (closeOnError) {
            closed = true;
            console.error("ERROR", data);
        }
    });

    while (!closed) {
        yield await next();
    }
}

jest.useFakeTimers();
jest.setTimeout(100_000);
test("player one shoots once and wins", async () => {
    execSync("tsc");

    const main = spawnChild("node dist/src/server.js --port 42000");
    await main.next();

    const client = spawnChild("cargo run --release -- --port 42000 -q 1 -g 1 -t 2 -d");
    let p1: PlayerState | null = null;
    let p2: PlayerState | null = null;
    for await (const msg of client) {
        if (msg.includes("GameResult")) {
            break;
        }

        if (msg.startsWith("DEBUG")) {
            const player = +msg[msg.indexOf("(") + 1];
            if (player === 1) {
                p1 = JSON.parse(JSON.parse(msg.substring(msg.indexOf("\""), msg.length - 1)));
            } else {
                p2 = JSON.parse(JSON.parse(msg.substring(msg.indexOf("\""), msg.length - 1)));
            }
        }

    }

    expect(p1);
    expect(p2);
    if (!p1 || !p2) {
        return;
    }

    expect(p1.won).toBe(true);
    expect(p2.won).toBe(false);

    expect(p1.bulletsFired).toBeGreaterThanOrEqual(220);
    expect(p1.bulletsFired).toBeLessThan(230);
    expect(p2.bulletsFired).toBeGreaterThanOrEqual(190);
    expect(p2.bulletsFired).toBeLessThan(200);
});

afterEach(() => {
    kills.forEach(k => {
        // this sometimes doesn't work
        k.kill("SIGKILL");

        if (k.pid) {
            execSync("kill -9 " + k.pid);
        }
    });
});
