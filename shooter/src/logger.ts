import pino, { Logger } from "pino";
import { Config } from "./cli";
import fs from "fs";

let logger: undefined | Logger = undefined;
export function getLogger(): Logger {
    if (!logger) {
        throw new Error("Logger not initialized");
    }

    return logger;
}

export function initLogger(args: Config): Logger {
    let fileTransport: undefined | ReturnType<typeof pino.transport> = undefined;

    if (args.logPath) {
        try {
            if (fs.existsSync(args.logPath)) {
                throw new Error("Log file already exists, delete/change path and rerun");
            }
        } catch (e) { }

        fileTransport = pino.transport({
            target: 'pino/file',
            options: { destination: args.logPath },
        });
    }

    logger = pino({
        level: args.logLevel || process.env.PINO_LEVEL || "warn",
    }, fileTransport);

    return logger;
}

