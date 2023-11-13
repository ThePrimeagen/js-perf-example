import { getLogger } from "../logger";
import { Game } from "./game";
import { getWriter } from "./data-writer";
import { getTimer, ticker } from "./ticker";

const FPS = 1000 / 60;

type WS = {
    send: (msg: string) => void,
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

const wsToState = new Map<WS, State>();
export function onMessage(ws: WS, msg: string) {
    const state = wsToState.get(ws);
    if (!state) {
        return;
    }

    try {
        state.messages.push(JSON.parse(msg) as Message);
    } catch (e) {
        console.error("ERROR", e);
        state.error = true;
    }
}

export function onClose(ws: WS) {
    const state = wsToState.get(ws);
    if (!state) {
        return;
    }

    state.close = true;
}

let gamesPlayed = 0;
async function playGame(p1: WS, p2: WS) {

    p1.send(JSON.stringify({ type: "start" }));
    p2.send(JSON.stringify({ type: "start" }));

    const s1 = createState();
    const s2 = createState();
    wsToState.set(p1, s1);
    wsToState.set(p2, s2);

    const timer = getTimer();
    const gameTicker = ticker(FPS, getWriter());
    const game = new Game(100);
    let ticksTotal = 0;
    let lastRun = Date.now();

    function run() {
        const now = Date.now();
        let ticks = now - lastRun;
        lastRun = now;
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
        if (game.ended || s1.close || s2.close || s1.error || s2.error) {
            finish();
        } else {
            timer.add(run, gameTicker());
        }
    }
    run();

    function finish() {
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
        wsToState.delete(p1);
        wsToState.delete(p2);
    }
}

export function createGameRunner() {
    let waitingPlayer: WS | undefined = undefined;
    return function addPlayer(socket: WS) {
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

