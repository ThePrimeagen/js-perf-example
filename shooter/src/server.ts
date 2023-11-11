import ws from "ws";
import { createGameRunner } from "./game";
import * as consts from "./game/consts";
import { getConfig } from "./cli";
import { getLogger, initLogger } from "./logger";
import { getWriter } from "./game/data-writer";

const args = getConfig();
consts.initFromEnv();
consts.initFromCLI(args);
initLogger(args);
getWriter(args);

const server = new ws.Server({ port: args.port });
const runner = createGameRunner();

getLogger().info(args, "starting server");

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

