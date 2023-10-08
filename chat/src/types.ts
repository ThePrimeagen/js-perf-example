import { WebSocket } from "uWebSockets.js";

export interface WS {
    send(message: string): void;
}

export interface IRoom {
    name: string;

    add(user: WS): void;
    push(from: WS, message: string): void;
    remove(user: WS): void;
}


