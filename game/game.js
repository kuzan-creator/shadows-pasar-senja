// Main game loop for Shadows of Pasar Senja — Stealth Heist.
// States: title → playing → caught / complete → win. The player steals 3
// golden lanterns per level, then reaches the green EXIT. Guards patrol,
// grow suspicious, investigate noises and chase; cameras sweep; dogs smell.
// URL hooks (used by the screenshot and self-test runs, same code path):
//   ?shot=cover|museum|harbor|victory  — stage a fixed scene for a screenshot
//   ?selftest=1                         — run automated checks, write results
//                                        into #selftest and document.title

import { LEVELS, cloneLevel, VIEW_W, VIEW_H, HUD_H } from './levels.js';
import { Guard, Dog, Camera, pointInRect } from './guard.js';
import { Player } from './player.js';
import { AudioEngine } from './audio.js';
import { drawLevel, drawTitle, drawOverlay } from './render.js';

const BOUNDS = { x: 0, y: HUD_H, w: VIEW_W, h: VIEW_H - HUD_H };
const NOISE_RADIUS = 230;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new AudioEngine();
    this.levelIndex = 0;
    this.state = 'title'; // title | playing | caught | complete | win
    this.time = 0;
    this.coins = [];
    this.keys = { up: false, down: false, left: false, right: false, sneak: false };
    this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2 };
    this.staged = false;
    this.lastTime = 0;
    this.stepAccum = 0;
    this.guardStepAccum = 0;
    this.level = null;
    this.player = null;
    this.guards = [];
    this.dogs = [];
    this.cameras = [];
    this.loadLevel(0);
    this.bindInput();
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = cloneLevel(index);
    this.player = new Player(this.level.playerStart);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.dogs = this.level.dogs.map((d) => new Dog(d));
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.coins = [];
    this.time = 0;
    this.stepAccum = 0;
  }

  alertLevel() {
    let max = 0;
    for (const g of this.guards) max = Math.max(max, g.suspicion);
    for (const d of this.dogs) max = Math.max(max, d.suspicion);
    for (const c of this.cameras) max = Math.max(max, c.spotted * 100);
    return max;
  }

  bindInput() {
    const keyMap = {
      KeyW: 'up', ArrowUp: 'up',
      KeyS: 'down', ArrowDown: 'down',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'sneak', ShiftRight: 'sneak',
    };
    window.addEventListener('keydown', (e) => {
      this.audio.ensure();
      if (keyMap[e.key] || e.code in keyMap) {
        this.keys[keyMap[e.code] || keyMap[e.key]] = true;
        e.preventDefault();
      }
      if (e.code === 'KeyE') this.throwCoin();
      if (e.code === 'Enter') this.advance();
    });
    window.addEventListener('keyup', (e) => {
      const k = keyMap[e.code];
      if (k) this.keys[k] = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
      this.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      this.audio.ensure();
      if (this.state === 'title') this.advance();
      else if (this.state === 'playing') this.throwCoin();
      else this.advance();
      e.preventDefault();
    });
  }

  advance() {
    if (this.state === 'title') {
      this.state = 'playing';
      this.audio.ensure();
    } else if (this.state === 'caught') {
      this.loadLevel(this.levelIndex);
      this.state = 'playing';
    } else if (this.state === 'complete') {
      if (this.levelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.levelIndex + 1);
        this.state = 'playing';
      } else {
        this.state = 'win';
      }
    } else if (this.state === 'win') {
      this.loadLevel(0);
      this.state = 'title';
    }
  }

  throwCoin() {
    if (this.state !== 'playing' || this.player.coins <= 0) return;
    this.player.coins -= 1;
    const target = this.player.coinTarget(this.mouse.x, this.mouse.y, BOUNDS);
    this.coins.push({ x: target.x, y: target.y, ttl: 6 });
    this.audio.coinClink();
    for (const g of this.guards) g.hearNoise(target.x, target.y, NOISE_RADIUS);
    for (const d of this.dogs) {
      if (Math.hypot(d.x - target.x, d.y - target.y) <= NOISE_RADIUS) {
        d.state = 'suspicious';
        d.suspicion = Math.max(d.suspicion, 55);
        d.lastSeen = { x: target.x, y: target.y };
      }
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.time += dt;
    const moved = this.player.update(dt, this.keys, this.level.walls, BOUNDS);
    if (moved > 0) {
      this.stepAccum += moved;
      if (this.stepAccum > 42) {
        this.stepAccum = 0;
        this.audio.footstep(this.player.sneaking);
      }
    }
    // Loot pickup.
    for (const loot of this.level.loot) {
      if (!loot.taken && Math.hypot(loot.x - this.player.x, loot.y - this.player.y) < 28) {
        loot.taken = true;
        this.player.loot += 1;
        this.audio.pickup();
      }
    }
    // Thrown coins fade away.
    for (const coin of this.coins) coin.ttl -= dt;
    this.coins = this.coins.filter((c) => c.ttl > 0);

    // Watchers.
    let anyAlert = false;
    for (const g of this.guards) {
      const prev = g.state;
      const before = g.suspicion;
      g.update(dt, this.player, this.level.covers, this.level.walls);
      if (prev !== 'suspicious' && g.state === 'suspicious' && before < 50) {
        this.audio.suspicious();
      }
      if (prev !== 'alert' && g.state === 'alert') {
        this.audio.alarm();
        anyAlert = true;
      }
      if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < g.radius + this.player.radius + 2) {
        if (g.state === 'alert') this.getCaught();
      }
    }
    for (const d of this.dogs) {
      d.update(dt, this.player, this.level.covers, this.level.walls);
      if (Math.hypot(d.x - this.player.x, d.y - this.player.y) < d.radius + this.player.radius + 2) {
        if (d.state === 'alert') this.getCaught();
      }
    }
    for (const cam of this.cameras) {
      cam.update(dt, this.player, this.level.walls, () => {
        // Camera lock-on: every guard turns suspicious and hunts the player.
        for (const g of this.guards) {
          g.state = 'suspicious';
          g.suspicion = Math.max(g.suspicion, 70);
          g.lastSeen = { x: this.player.x, y: this.player.y };
          g.investigateTimer = 4;
        }
        this.audio.alarm();
      });
    }
    if (anyAlert) this.audio.alarm();

    // Guard footsteps, audible when a guard walks near the player.
    this.guardStepAccum += dt;
    if (this.guardStepAccum > 0.55) {
      this.guardStepAccum = 0;
      for (const g of this.guards) {
        if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < 320) {
          this.audio.guardStep();
          break;
        }
      }
    }

    // Exit: only open once all 3 lanterns are stolen.
    if (this.player.loot >= 3 && pointInRect(this.player.x, this.player.y, this.level.exit)) {
      if (this.levelIndex + 1 < LEVELS.length) {
        this.state = 'complete';
      } else {
        this.state = 'win';
        this.audio.winJingle();
      }
    }
  }

  getCaught() {
    if (this.state !== 'playing') return;
    this.state = 'caught';
    this.audio.caught();
  }

  render() {
    if (this.state === 'title') {
      drawTitle(this.ctx, this);
    } else if (this.state === 'caught') {
      drawLevel(this.ctx, this);
      drawOverlay(this.ctx, 'CAUGHT!', [
        'A guard grabbed you in the lamplight.',
        'Study the patrol, use the shadows, and try again.',
      ], '#ff2d2d');
    } else if (this.state === 'complete') {
      drawLevel(this.ctx, this);
      drawOverlay(this.ctx, 'CLEAN GETAWAY', [
        `${this.level.name} cleared — all 3 lanterns stolen.`,
        'The next heist is already waiting.',
      ], '#39d353');
    } else if (this.state === 'win') {
      drawLevel(this.ctx, this);
      drawOverlay(this.ctx, 'MASTER THIEF', [
        'All three heists done. Pasar Malam, the Museum, the Harbour —',
        'not a single guard ever laid a hand on you. The legend grows.',
      ], '#ffd54a');
    } else {
      drawLevel(this.ctx, this);
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (!this.staged) this.update(dt);
    else this.time += dt; // staged scenes only animate bobbing and blinking
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    requestAnimationFrame((t) => {
      this.lastTime = t;
      this.frame(t);
    });
  }

  // Stage a fixed scene for a screenshot. The AI is frozen so the frame
  // stays exactly as composed while the browser takes the picture.
  stage(shot) {
    this.staged = true;
    this.state = 'playing';
    if (shot === 'cover') {
      this.loadLevel(0);
      this.player.x = 470;
      this.player.y = 445;
      this.player.sneaking = true;
      this.player.loot = 1;
      this.player.coins = 2;
      this.level.loot[0].taken = true;
      this.time = 47;
      const g = this.guards[0];
      g.x = 560;
      g.y = 260;
      g.dir = Math.PI / 2;
      g.suspicion = 62;
      g.state = 'suspicious';
      g.lastSeen = { x: 470, y: 445 };
      this.guards[1].x = 780;
      this.guards[1].y = 660;
      this.guards[1].dir = Math.PI;
      this.coins.push({ x: 640, y: 380, ttl: 6 });
    } else if (shot === 'museum') {
      this.loadLevel(1);
      this.player.x = 620;
      this.player.y = 600;
      this.player.sneaking = true;
      this.player.loot = 2;
      this.player.coins = 1;
      this.level.loot[0].taken = true;
      this.level.loot[1].taken = true;
      this.time = 83;
      const g = this.guards[0];
      g.x = 700;
      g.y = 420;
      g.dir = Math.PI * 0.75;
      g.suspicion = 55;
      g.state = 'suspicious';
      g.lastSeen = { x: 620, y: 600 };
      this.cameras[0].phase = 1.2;
      this.cameras[1].phase = 2.4;
      this.cameras[2].phase = 0.4;
      this.cameras[0].spotted = 0.5;
    } else if (shot === 'harbor') {
      this.loadLevel(2);
      this.player.x = 700;
      this.player.y = 540;
      this.player.sneaking = true;
      this.player.loot = 2;
      this.player.coins = 2;
      this.level.loot[0].taken = true;
      this.level.loot[1].taken = true;
      this.time = 121;
      const d = this.dogs[0];
      d.x = 780;
      d.y = 560;
      d.dir = Math.PI;
      d.suspicion = 70;
      d.state = 'suspicious';
      d.lastSeen = { x: 700, y: 540 };
      this.guards[0].x = 600;
      this.guards[0].y = 300;
      this.guards[0].dir = Math.PI / 2;
      this.guards[1].x = 1050;
      this.guards[1].y = 300;
      this.guards[1].dir = -Math.PI / 2;
    } else if (shot === 'victory') {
      this.loadLevel(2);
      this.level.loot.forEach((l) => { l.taken = true; });
      this.player.loot = 3;
      this.player.x = 1160;
      this.player.y = 145;
      this.time = 188;
      this.state = 'win';
    }
  }
}

// Automated self-test: runs the real update path headlessly and reports
// PASS/FAIL lines into #selftest and document.title for the play-test run.
export function runSelfTest(game) {
  const results = [];
  const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  try {
    check('levels=3', LEVELS.length === 3);
    check('guards-level1=3', game.guards.length === 3);
    const g = game.guards[0];
    const before = g.suspicion;
    // Put the player right in front of the guard, in the open: suspicion must rise.
    game.player.x = g.x + Math.cos(g.dir) * 60;
    game.player.y = g.y + Math.sin(g.dir) * 60;
    game.player.sneaking = false;
    g.update(0.5, game.player, game.level.covers, game.level.walls);
    check('detection-rises', g.suspicion > before);
    // Behind a wall the guard must not see the player.
    const wall = game.level.walls[0];
    game.player.x = wall.x + wall.w / 2;
    game.player.y = wall.y + wall.h + 60;
    g.x = wall.x + wall.w / 2;
    g.y = wall.y - 60;
    g.dir = Math.PI / 2;
    g.suspicion = 0;
    g.state = 'patrol';
    g.update(0.5, game.player, game.level.covers, game.level.walls);
    check('wall-blocks-sight', g.suspicion === 0);
    // Coin throw: one coin less, one coin on the ground, guards hear it.
    // (Stand next to guard 0 first, so the clink is inside hearing range.)
    game.loadLevel(0);
    game.player.x = 300;
    game.player.y = 300;
    const coinsBefore = game.player.coins;
    game.mouse = { x: game.player.x + 200, y: game.player.y };
    game.throwCoin();
    check('coin-thrown', game.player.coins === coinsBefore - 1 && game.coins.length === 1);
    check('guard-hears-coin', game.guards.some((gg) => gg.state === 'suspicious'));
    // Loot pickup and exit flow on a fresh level.
    game.loadLevel(0);
    const loot = game.level.loot[0];
    game.player.x = loot.x;
    game.player.y = loot.y;
    game.update(0.016);
    check('loot-pickup', game.player.loot === 1 && loot.taken);
    game.player.loot = 3;
    game.player.x = game.level.exit.x + 10;
    game.player.y = game.level.exit.y + 10;
    game.update(0.016);
    check('exit-completes-level', game.state === 'complete');
    // Cameras and dogs exist on levels 2 and 3.
    game.loadLevel(1);
    check('cameras-level2=3', game.cameras.length === 3);
    game.loadLevel(2);
    check('dogs-level3=2', game.dogs.length === 2);
    game.loadLevel(0);
    game.state = 'playing';
  } catch (err) {
    results.push(`FAIL exception: ${err.message}`);
  }
  const el = document.getElementById('selftest');
  if (el) el.textContent = results.join('\n');
  document.title = results.every((r) => r.startsWith('PASS')) ? 'SELFTEST ALL PASS' : 'SELFTEST FAIL';
  return results;
}

function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.__game = game;
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    game.stage(shot);
  } else if (params.get('selftest') === '1') {
    game.state = 'playing';
    game.start();
    setTimeout(() => runSelfTest(game), 300);
    return;
  }
  game.start();
}

window.addEventListener('error', (e) => {
  const el = document.getElementById('err');
  if (el) el.textContent = `JS ERROR: ${e.message}`;
  document.title = `ERR: ${e.message}`;
});

boot();
