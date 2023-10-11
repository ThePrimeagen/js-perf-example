import express from "express";
import { Chat } from "./chat";
import { createRoom } from "./room/room";
import { initConfig } from "./cli";
import { initLogger } from "./logger";
import WebSocket from "ws";

const config = initConfig();
initLogger(config);
console.log("port", config.port);
const chat = new Chat(createRoom);

const server = new WebSocket.Server({ port: config.port });
server.on("connection", (ws) => {
    ws.on("message", (message) => {
        chat.msg(ws, message);
    });
    ws.on("close", () => {
        chat.close(ws);
    });
});

server.on("listening", () => {
    console.log("listening on", config.port);
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
