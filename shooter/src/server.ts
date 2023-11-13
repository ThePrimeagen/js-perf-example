// import ws from "ws";
import { createGameRunner, onClose, onMessage } from "./game";
import * as consts from "./game/consts";
import { getConfig } from "./cli";
import { getLogger, initLogger } from "./logger";
import { getWriter } from "./game/data-writer";
import * as uWS from "uWebSockets.js";

const args = getConfig();
consts.initFromEnv();
consts.initFromCLI(args);
initLogger(args);
getWriter(args);

// const server = new ws.Server({ port: args.port });
const runner = createGameRunner();

getLogger().info(args, "starting server");

uWS.App().ws("/*", {
    close(ws) {
        onClose(ws);
    },

    open(ws) {
        runner(ws);
    },

    message: (ws, message) => {
        onMessage(ws, Buffer.from(message).toString());
    }

}).listen(args.port, (listenSocket) => {

    if (listenSocket) {
        getLogger().info("listening on", args.port);
        console.log("listening on", args.port);
    } else {
        getLogger().error("cannot start server");
        console.error("cannot start server");
    }

});

/*
let id = 0;
server.on("connection", (socket) => {
    getLogger().info("new connection");
    // @ts-ignore
    socket.MY_ID = ++id;

    runner(socket);
});


server.on("listening", () => {
    getLogger().info("listening on", args.port);
    console.log("listening on", args.port);
});

server.on("error", (err) => {
    getLogger().error({ err }, "cannot start server");
    console.error("cannot start server", err);
});

*/
