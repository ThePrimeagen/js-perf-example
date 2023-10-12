import cli from "command-line-args";

const args = [{
    name: "logLevel",
    type: String,
    defaultValue: undefined,
}, {
    name: "logPath",
    type: String,
    alias: "l",
    defaultValue: undefined,
}, {
    name: "port",
    type: Number,
    alias: "p",
    defaultValue: 42069,
}, {
    name: "reportInterval",
    type: Number,
    alias: "r",
    defaultValue: 1000,
}, {
    name: "bulletSpeed",
    type: Number,
    alias: "b",
    defaultValue: 500,
}];

export type Config = {
    logLevel?: string;
    logPath?: string;
    port: number;
    bulletSpeed: number;
    reportInterval: number;
}

export function getConfig() {
    return cli(args) as Config;
}
