import express from "express";
import { Chat } from "./chat";
import { createRoom } from "./room/room";
import { initConfig } from "./cli";
import { initLogger } from "./logger";

import uWS from "uWebSockets.js";

const config = initConfig();
initLogger(config);
console.log("port", config.port);
const chat = new Chat(createRoom);

const wss = uWS.App().ws("/*", {
    close(ws) {
        chat.close(ws);
    },
    message(ws, message) {
        chat.msg(wss, ws, message);
    }
});

wss.listen(config.port, (listenSocket) => {
    if (listenSocket) {
        console.log("Listening to port " + config.port);
    } else {
        console.log("failure to launch at " + config.port);
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
