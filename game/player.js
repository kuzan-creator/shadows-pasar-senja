// The thief: Raka, a young burglar in a dark hood. Moves with WASD or the
// arrow keys, sneaks while Shift is held (slower, harder to see), and throws
// a distraction coin with E (or a mouse click) towards the mouse pointer.
// Running makes noise; sneaking is silent. Coins are limited per level.

export const WALK_SPEED = 165;
export const SNEAK_SPEED = 85;
export const PLAYER_RADIUS = 13;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.dir = -Math.PI / 2; // facing up
    this.sneaking = false;
    this.moving = false;
    this.coins = 3;
    this.loot = 0;
    this.stepPhase = 0;
    this.radius = PLAYER_RADIUS;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.dir = -Math.PI / 2;
    this.sneaking = false;
    this.moving = false;
    this.coins = 3;
    this.loot = 0;
    this.stepPhase = 0;
  }

  // keys: {up, down, left, right, sneak} — returns distance moved this frame
  update(dt, keys, walls, bounds) {
    let mx = 0;
    let my = 0;
    if (keys.up) my -= 1;
    if (keys.down) my += 1;
    if (keys.left) mx -= 1;
    if (keys.right) mx += 1;
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = !!keys.sneak;
    if (!this.moving) return 0;
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const step = speed * dt;
    this.dir = Math.atan2(my, mx);
    const nx = this.x + mx * step;
    const ny = this.y + my * step;
    const r = this.radius;
    const blocked = (px, py) =>
      walls.some(
        (w) => px + r > w.x && px - r < w.x + w.w && py + r > w.y && py - r < w.y + w.h,
      );
    if (!blocked(nx, this.y)) this.x = nx;
    if (!blocked(this.x, ny)) this.y = ny;
    this.x = Math.max(bounds.x + r, Math.min(bounds.x + bounds.w - r, this.x));
    this.y = Math.max(bounds.y + r, Math.min(bounds.y + bounds.h - r, this.y));
    this.stepPhase += step;
    return step;
  }

  // Where a thrown coin lands: clamped to the play area, at most 320px away.
  coinTarget(mx, my, bounds) {
    const dx = mx - this.x;
    const dy = my - this.y;
    const d = Math.hypot(dx, dy);
    const max = 320;
    const scale = d > max ? max / d : 1;
    return {
      x: Math.max(bounds.x + 10, Math.min(bounds.x + bounds.w - 10, this.x + dx * scale)),
      y: Math.max(bounds.y + 10, Math.min(bounds.y + bounds.h - 10, this.y + dy * scale)),
    };
  }
}
