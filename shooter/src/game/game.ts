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
    bulletsFired: number;
    won: boolean;
    x: number;
    ticks: number;
    direction: 1 | -1;
    bullets: Set<Bullet>;
}

let id = 0;
function createState(x: number, direction: 1 | -1) {
    return {
        lastFire: -1,
        bulletsFired: 0,
        won: false,
        x,
        direction,
        id: ++id,
        ticks: 0,
        bullets: new Set<Bullet>(),
    };
}

function collide(b1: Bullet, b2: Bullet): boolean {
    return Math.abs(b1.x - b2.x) < consts.BULLET_RADIUS * 2;
}

function updateBullet(b: Bullet, delta: number) {
    const xPerMS = consts.BULLET_SPEED / 1000;
    const diff = xPerMS * b.direction * delta;
    b.x += diff;
}

export class Game {
    ended: boolean = false;

    private s1: PlayerState;
    private s2: PlayerState;

    private logger: Logger;
    public loopCount: number = 0;

    private currentTime: number = 0;

    constructor(private fireRateMS: number, distance: number = 1000) {
        this.s1 = createState(-distance, 1);
        this.s2 = createState(distance, -1);
        this.logger = getLogger().child({ p1: this.s1, p2: this.s2, id: id++ });
    }

    log() {
        console.log(`Game
---------------
s1: ${JSON.stringify(this.s1)}
s2: ${JSON.stringify(this.s2)}`);
    }

    update(delta: number) {
        this.s1.ticks += delta;
        this.s2.ticks += delta;

        this.loopCount++;
        this.currentTime += delta;

        for (const b of this.s2.bullets) {
            updateBullet(b, delta);
            if (b.x < this.s1.x + consts.PLAYER_RADIUS) {
                this.logger.info({ s1: this.s1, s2: this.s2, loopCount: this.loopCount }, "player one lost");
                this.s2.won = true;
                this.s1.won = false;
                this.ended = true;
                return;
            }
        }

        // test for bullet collisions
        const bulletsRemoved = [];
        for (const b of this.s1.bullets) {
            updateBullet(b, delta);
            if (b.x > this.s2.x - consts.PLAYER_RADIUS) {
                this.logger.info({ s1: this.s1, s2: this.s2, loopCount: this.loopCount }, "player two lost");
                this.s2.won = false;
                this.s1.won = true;
                this.ended = true;
                return;
            }
            for (const b2 of this.s2.bullets) {
                if (collide(b, b2)) {
                    this.logger.info({
                        b,
                        other: b2,
                    }, "bullets collided");
                    bulletsRemoved.push(b);
                    bulletsRemoved.push(b2);
                    break;
                }
            }
        }

        bulletsRemoved.forEach(b => {
            this.s1.bullets.delete(b);
            this.s2.bullets.delete(b);
        });
    }

    fire(player: number) {
        const state = this.getState(player);
        const now = this.currentTime;
        if (state.lastFire + this.fireRateMS > now && state.lastFire !== -1) {
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
        state.bullets.add({
            x: state.x + (consts.PLAYER_RADIUS + consts.BULLET_RADIUS) * state.direction,
            direction: state.direction,
            id: ++id,
        });
        state.bulletsFired++;

        this.logger.info("bullet created", state);
    }

    private getState(player: number): PlayerState {
        return player === 1 ? this.s1 : this.s2;
    }
}
