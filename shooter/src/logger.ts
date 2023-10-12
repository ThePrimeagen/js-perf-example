import pino, { Logger } from "pino";
import { Config } from "./cli";

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

