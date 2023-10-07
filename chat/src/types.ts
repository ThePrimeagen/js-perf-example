import { WebSocket } from "uWebSockets.js";

export type WS = WebSocket<any>;

export interface IRoom {
    name: string;

    add(user: WS): void;
    push(from: WS, message: string): void;
    remove(user: WS): void;
}


