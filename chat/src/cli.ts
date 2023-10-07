import cli from "command-line-args";

export type Config = {
    port: number;
    logPath: string;
    logLevel: string;
    reportInterval: number;
}

const args = [{
    name: "port",
    alias: "p",
    type: Number,
    defaultValue: 42069,
}, {
    name: "logLevel",
    alias: "x",
    type: String,
    defaultValue: "info",
}, {
    name: "reportInterval",
    alias: "r",
    type: Number,
    defaultValue: 5000,
}, {
    name: "logPath",
    alias: "l",
    type: String,
    defaultValue: undefined,
}];

export function initConfig(): Config {
    return cli(args) as Config;
}
