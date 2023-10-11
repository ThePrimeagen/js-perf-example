import { WebSocket } from "uWebSockets.js";

export interface WS {
    send(message: string): void;
    subscribe(topic: string): void;
    unsubscribe(topic: string): void;
}
export interface Publish {
    publish(topic: string, message: string): void;
}

export interface IRoom {
    name: string;

    add(user: WS): void;
    push(from: WS, message: string): void;
    remove(user: WS): void;
}


