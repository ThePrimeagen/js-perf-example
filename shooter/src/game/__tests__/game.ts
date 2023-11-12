import { Config } from "../../cli";
import { initLogger } from "../../logger";
import { getConsts } from "../consts";
import { Game } from "../game";

const consts = getConsts();
initLogger({
    reportInterval: 500,
    logLevel: process.env.TEST_LOG ? "debug" : "warn",
} as any as Config);

function speeds(): [number, number] {
    return [
        Math.ceil(consts.PLAYER_RADIUS * 1000 / consts.BULLET_SPEED),
        Math.ceil(consts.BULLET_RADIUS * 1000 / consts.BULLET_SPEED),
    ];
}

test("player one shoots and wins", () => {
    const distance = 1000;
    const game = new Game(100, distance);

    // fires one bullet
    game.fire(1);

    const timeTaken = Math.floor((distance * 2) / consts.BULLET_SPEED) * 1000;
    const [playerRadius, bulletRadius] = speeds();
    game.update(timeTaken - 2 * playerRadius - bulletRadius - 1);

    expect(game.ended).toBe(false);

    game.update(3);

    expect(game.ended).toBe(true);
});

test("player two shoots and wins", () => {
    const distance = 1000;
    const game = new Game(100, distance);

    // fires one bullet
    game.fire(2);

    const timeTaken = Math.floor((distance * 2) / consts.BULLET_SPEED) * 1000;
    const [playerRadius, bulletRadius] = speeds();
    game.update(timeTaken - 2 * playerRadius - bulletRadius - 1);

    expect(game.ended).toBe(false);

    game.update(2);

    expect(game.ended).toBe(true);
});

test("bullets collide", () => {
    const distance = 1000;
    const game = new Game(100, distance);
    game.fire(2);
    game.fire(1);

    const timeToCollide = (1000 / consts.BULLET_SPEED) * 2000 / 2;
    let timePassed = 0;
    do {
        game.update(16);
        timePassed += 16;
    } while (timePassed < timeToCollide);

    const stats1 = game.gameStats();
    expect(
        stats1[0].bullets.size +
        stats1[1].bullets.size).toBe(0);
});

test("game play", () => {
    const distance = 1000;
    const game = new Game(100, distance);
    let ticks = 0;
    let last1 = 0;
    let shot1 = 0;
    let last2 = 0;
    let shot2 = 0;
    let time = 0;
    do {
        game.update(16);
        ticks++;
        time += 16;

        if (time - last1 > 120) {
            game.fire(1);
            last1 = time;
            shot1++;
        }

        if (time - last2 > 160) {
            game.fire(2);
            last2 = time;
            shot2++;
        }

    } while (!game.ended);

    expect(ticks).toEqual(891);
    expect(game.gameStats()[0].won).toBe(true);
    expect(game.gameStats()[1].won).toBe(false);
    expect(game.gameStats()[0].bulletsFired).toBe(shot1);
    expect(game.gameStats()[1].bulletsFired).toBe(shot2);
});
