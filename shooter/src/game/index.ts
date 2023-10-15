import { getLogger } from "../logger";
import WebSocket from "ws";
import { Game } from "./game";
import { Writer, getWriter } from "./data-writer";

const FPS = 1000 / 60;

function ticker(rate: number, writer: Writer) {
    let next = Date.now() + rate;
    let previousNow = 0;

    return async function tickRunner() {
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
        const remaining = flooredNext - now;

        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }

        const endNow = Date.now();
        const extras = endNow - flooredNext;

        next = next + rate;
        previousNow = now;

        writer.write("tickRuntime", endNow - now);

        return extras + remaining;
    }
}

async function waitForOpen(socket: WebSocket): Promise<void> {
    return new Promise(function waitForOpen(resolve, reject) {
        if (socket.readyState !== WebSocket.OPEN) {
            socket.once("open", resolve);
            socket.once("error", reject);
        } else {
            resolve();
        }
    });
}

type State = {
    messages: Message[],
    error: boolean,
    close: boolean,
}

function createState(): State {
    return {
        messages: [],
        error: false,
        close: false,
    };
}

type Start = {
    type: "start"
}

type Stop = {
    type: "stop",
    ticks: number,
    bulletsFired: number,
    won: boolean,
    errorMsg?: string,
}

type Fire = {
    type: "fire",
}

type Message = Stop | Start | Fire;

function onMessage(state: State) {
    return function onMessage(msg: string | Buffer) {
        try {
            state.messages.push(JSON.parse(msg.toString()) as Message);
        } catch (e) {
            console.error("ERROR", e);
            state.error = true;
        }
    }
}

let gamesPlayed = 0;
async function playGame(p1: WebSocket, p2: WebSocket) {
    try {
        await Promise.all([waitForOpen(p1), waitForOpen(p2)]);
    } catch (e) {
        // handle error
    }

    p1.send(JSON.stringify({ type: "start" }));
    p2.send(JSON.stringify({ type: "start" }));

    const s1 = createState();
    const s2 = createState();

    p1.on("message", onMessage(s1));
    p2.on("message", onMessage(s2));
    p1.on("close", () => s1.close = true);
    p2.on("close", () => s2.close = true);
    p1.on("error", (e) => {
        console.error("p1 ERROR", e);
        s1.error = true
    });
    p2.on("error", (e) => {
        console.error("p2 ERROR", e);
        s2.error = true
    });

    const gameTicker = ticker(FPS, getWriter());
    const game = new Game(100);
    let ticksTotal = 0;

    do {
        // state checking / clean up

        let ticks = await gameTicker();
        ticksTotal += ticks;
        while (ticks > 0) {
            if (ticks > 16) {
                game.update(16);
                ticks -= 16;
            } else {
                game.update(ticks);
                ticks = 0;
            }
        }

        for (const msg of s1.messages) {
            if (msg.type === "fire") {
                game.fire(1);
            }
        }

        for (const msg of s2.messages) {
            if (msg.type === "fire") {
                game.fire(2);
            }
        }

        s1.messages = [];
        s2.messages = [];

    } while (!game.ended && !s1.close && !s2.close && !s1.error && !s2.error);

    const stopped1 = s1.close || s1.error;
    const stopped2 = s2.close || s2.error;
    const [
        stats1,
        stats2,
    ] = game.gameStats();

    // no need to do anything, both somehow stopped
    if (stopped1 && stopped2) { }

    else if (stopped1) {
        p2.send(JSON.stringify({
            type: "stop",
            errorMsg: "Opponent disconnected",
            ...stats2,
        }));
    }

    else if (stopped2) {
        p1.send(JSON.stringify({
            type: "stop",
            errorMsg: "Opponent disconnected",
            ...stats1,
        }));
    }

    else {
        p1.send(JSON.stringify({
            type: "stop",
            ...stats1,
        }));
        p2.send(JSON.stringify({
            type: "stop",
            ...stats2,
        }));
    }

    gamesPlayed++;
    if (gamesPlayed % 100 == 0) {
        getLogger().error(`Played ${gamesPlayed} games`);
    }

    getWriter().count("games-played");
}

export function createGameRunner() {
    let waitingPlayer: WebSocket | undefined = undefined;
    return function addPlayer(socket: WebSocket) {
        if (!waitingPlayer) {
            waitingPlayer = socket;
            getLogger().info("Player 1 connected");
            return;
        }

        getLogger().info("Player 2 connected");
        playGame(waitingPlayer, socket);
        waitingPlayer = undefined;
    };
}

