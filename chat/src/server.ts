import express from "express";
import { Chat, string } from "./chat";
import { createRoom } from "./room/room";
import { initConfig } from "./cli";
import { initLogger } from "./logger";

import ws from "uWebSockets.js";
import { WS } from "./types";

const config = initConfig();
initLogger(config);
console.log("port", config.port);
const chat = new Chat(createRoom);

const wss = ws.App();
wss.ws("/*", {
    message: (ws: WS, message: any) => {
        chat.msg(ws, message);
    },

    close: (ws) => {
        chat.close(ws);
    },
});

wss.listen(config.port, (token) => {
    if (token) {
        console.log("Listening to port " + config.port);
    } else {
        console.log("Failed to listen to port " + config.port);
    }
});

const app = express();
app.get("/healthcheck", (_, res) => {
    res.status(200).end();
});
app.get("/stop", (_, res) => {
    console.log("stopping");
    setTimeout(function() {
        process.exit(0);
    }, 100);
    res.status(200).end();
});

app.listen(1337, () => { console.log("health check ready") });
