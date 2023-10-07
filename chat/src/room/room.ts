import { IRoom, WS } from "../types";

let id = 0;
export default class Room {
    private users: Map<WS, number>;

    constructor(public name: string) {
        this.users = new Map();
    }

    add(user: WS) {
        this.users.set(user, ++id);
    }

    remove(user: WS) {
        this.users.delete(user);
    }

    push(from: WS, message: string) {
        const id = this.users.get(from);
        if (!id) {
            // user hasn't joined the room yet
            return;
        }

        this.users.forEach((_, sock) => {
            sock.send(`${id} says ${message}`);
        });
    }
}

export function createRoom(name: string): IRoom {
    return new Room(name);
}

