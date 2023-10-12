import { Logger } from "pino";
import { getConsts } from "./consts";
import { getLogger } from "../logger";
const consts = getConsts();

type Bullet = {
    x: number;
    direction: 1 | -1;
    id: number;
}

export type PlayerState = {
    id: number;
    lastFire: number;
    bulletCount: number;
    won: boolean;
    x: number;
    direction: 1 | -1;
}

let id = 0;
function createState(x: number, direction: 1 | -1) {
    return {
        lastFire: 0,
        bulletCount: 0,
        won: false,
        x,
        direction,
        id: ++id,
    };
}

function collide(b1: Bullet, b2: Bullet): boolean {
    return Math.abs(b1.x - b2.x) < consts.BULLET_RADIUS * 2;
}

export class Game {
    ended: boolean = false;

    private s1: PlayerState;
    private s2: PlayerState;

    private bullets: Bullet[];
    private logger: Logger;
    public loopCount: number = 0;

    private startTime: number;

    constructor(private fireRateMS: number) {
        this.s1 = createState(-1000, 1);
        this.s2 = createState(1000, -1);
        this.bullets = [];
        this.logger = getLogger().child({ bullets: this.bullets, id: id++ });
        this.startTime = Date.now();
    }

    update(delta: number) {
        this.loopCount++;

        // test for bullet collisions
        for (let i = 0; i < this.bullets.length; ++i) {
            const b = this.bullets[i];

            if (b.x < this.s1.x + consts.PLAYER_RADIUS) {
                this.logger.info({ s1: this.s1, s2: this.s2, loopCount: this.loopCount }, "player one lost");
                this.s2.won = true;
                this.s1.won = false;
                this.ended = true;
                return;
            }

            if (b.x > this.s2.x - consts.PLAYER_RADIUS) {
                this.logger.info({ s1: this.s1, s2: this.s2, loopCount: this.loopCount }, "player two lost");
                this.s2.won = false;
                this.s1.won = true;
                this.ended = true;
                return;
            }

            let collided = false;
            for (let j = i + 1; j < this.bullets.length; ++j) {
                collided = collide(b, this.bullets[j]);
                if (collided) {
                    this.logger.info({
                        b,
                        other: this.bullets[j],
                    }, "bullets collided");
                    this.bullets.splice(j, 1);
                    this.bullets.splice(i, 1);
                    i--;
                    break;
                }
            }

            if (!collided) {
                const xPerMS = consts.BULLET_SPEED / 1000;
                b.x += xPerMS * b.direction * delta;
            }
        }
    }

    fire(player: number) {
        const state = this.getState(player);
        const now = Date.now();
        if (state.lastFire + this.fireRateMS > now) {
            this.logger.info("early fire, nothing happened", state);
            return;
        }

        state.lastFire = now;
        this.createBullet(state);
    }

    gameStats(): [PlayerState, PlayerState] {
        return [this.s1, this.s2];
    }

    private createBullet(state: PlayerState) {
        state.bulletCount++;
        this.bullets.push({
            x: state.x + (consts.PLAYER_RADIUS + consts.BULLET_RADIUS) * state.direction,
            direction: state.direction,
            id: ++id,
        });
        state.bulletCount++;

        this.logger.info("bullet created", state);
    }

    private getState(player: number): PlayerState {
        return player === 1 ? this.s1 : this.s2;
    }
}
