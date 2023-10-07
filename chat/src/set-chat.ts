import { IRoom, WS } from "./types";
import { getLogger } from "./logger";

export function string(item: string | Buffer | ArrayBuffer) {
    if (typeof item === "string") {
        return item;
    } else if (item instanceof Buffer) {
        return item.toString();
    }

    return Buffer.from(item).toString();
}

type MSG = {
    command: "MSG";
    room: string;
    message: string;
}

type JOIN = {
    command: "JOIN";
    room: string;
}

type LEAVE = {
    command: "LEAVE";
    room: string;
}

type Command = MSG | JOIN | LEAVE;

function isCommand(msg: string): boolean {
    return msg === "MSG" || msg === "JOIN" || msg === "LEAVE";
}

function getMessage(message: string | Buffer): Command | undefined {
    if (typeof message === "object") {
        message = string(message);
    }

    const [command, ...rest] = message.split(" ");
    if (!isCommand(command)) {
        return undefined;
    }

    if (command === "MSG") {
        return {
            command: "MSG",
            room: rest[0],
            message: rest.slice(1).join(" "),
        };
    } else if (command === "JOIN") {
        return {
            command: "JOIN",
            room: rest[0],
        };
    }
    return {
        command: "LEAVE",
        room: rest[0],
    };
}


export class Chat {
    private rooms: Map<string, IRoom>;

    constructor(private createRoom: (name: string) => IRoom) {
        this.rooms = new Map();
    }

    msg(user: WS, msg: string | Buffer) {
        const message = getMessage(msg);
        if (!message) {
            return;
        }

        if (message.command === "JOIN") {
            this.getRoom(message.room).add(user);
        } else if (message.command === "MSG") {
            this.getRoom(message.room).push(user, message.message);
        } else {
            this.getRoom(message.room).remove(user);
        }
    }

    close(user: WS) {
        this.rooms.forEach((room) => {
            room.remove(user);
        });
    }

    private getRoom(roomName: string): IRoom {
        let room = this.rooms.get(roomName);

        if (!room) {
            room = this.createRoom(roomName);
            this.rooms.set(roomName, room);
        }

        return room
    }
}


