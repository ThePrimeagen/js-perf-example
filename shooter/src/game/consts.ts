import { Config } from "../cli";

let consts = {
    BULLET_SPEED: 500,
    BULLET_RADIUS: 12,
    PLAYER_RADIUS: 25, // these really don't matter
};

export function getConsts(): typeof consts {
    return consts;
}

export function initFromCLI(args: Config) {
    if (args.bulletSpeed) {
        consts.BULLET_SPEED = args.bulletSpeed;
    }
}

export function initFromEnv() {
    const bulletSpeed = +(process.env.BULLET_SPEED || "");
    if (bulletSpeed) {
        consts.BULLET_SPEED = bulletSpeed;
    }
}

