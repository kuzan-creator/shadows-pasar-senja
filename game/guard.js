// Guard, dog and camera AI for Shadows of Pasar Senja.
// A guard patrols waypoints, sweeps a vision cone, and builds suspicion when
// the player is inside the cone with a clear line of sight. Suspicion stages:
//   0-49  calm (patrol)      50-99 suspicious (investigate last seen spot)
//   100   alert (chase the player; touch the player and the run is caught)
// Dogs are faster with a short cone but a smell radius that works through
// cover. Cameras sweep a fixed cone from the wall and raise the alarm fast.

export const CONE_RANGE = 200;
export const CONE_HALF = 0.62; // radians, about 35 degrees each side
export const DOG_RANGE = 150;
export const DOG_SMELL = 85;

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Does segment (x1,y1)-(x2,y2) cross rectangle r?
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  // Endpoint inside the rect
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Check the four edges with a parametric test
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    const den = dx * (ey2 - ey1) - dy * (ex2 - ex1);
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ex1 - x1) * (ey2 - ey1) - (ey1 - y1) * (ex2 - ex1)) / den;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

export function lineOfSight(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function pointInCover(x, y, covers) {
  for (const c of covers) {
    if (pointInRect(x, y, c)) return c.kind;
  }
  return null;
}

export class Guard {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.waypoints = def.waypoints;
    this.speed = def.speed;
    this.wp = 1 % def.waypoints.length;
    this.dir = 0;
    this.state = 'patrol'; // patrol | suspicious | alert
    this.suspicion = 0;
    this.lastSeen = null;
    this.investigateTimer = 0;
    this.pauseTimer = 0;
    this.radius = 14;
    this.kind = 'guard';
  }

  // How fast suspicion grows when the player is visible right now.
  visibilityRate(player, covers, walls) {
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > CONE_RANGE) return 0;
    const ang = angleTo(this.x, this.y, player.x, player.y);
    if (Math.abs(angleDiff(ang, this.dir)) > CONE_HALF) return 0;
    if (!lineOfSight(this.x, this.y, player.x, player.y, walls)) return 0;
    let rate = 55;
    if (d < 80) rate = 110; // very close: spotted almost instantly
    else if (d < 140) rate = 75;
    if (player.sneaking) rate *= 0.45;
    const coverKind = pointInCover(player.x, player.y, covers);
    if (coverKind === 'shadow') rate *= 0.35;
    else if (coverKind === 'bush') rate *= 0.25;
    return rate;
  }

  hearNoise(x, y, radius) {
    if (dist(this.x, this.y, x, y) <= radius && this.state !== 'alert') {
      this.state = 'suspicious';
      this.suspicion = Math.max(this.suspicion, 55);
      this.lastSeen = { x, y };
      this.investigateTimer = 4;
    }
  }

  update(dt, player, covers, walls) {
    const rate = this.visibilityRate(player, covers, walls);
    if (rate > 0) {
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      if (this.suspicion >= 100) this.state = 'alert';
      else if (this.suspicion >= 50) this.state = 'suspicious';
    } else {
      this.suspicion = Math.max(0, this.suspicion - 22 * dt);
      if (this.state === 'alert' && this.suspicion < 60) {
        this.state = 'suspicious';
        this.investigateTimer = 3;
      } else if (this.state === 'suspicious' && this.suspicion <= 0) {
        this.state = 'patrol';
      }
    }

    let target = null;
    let speed = this.speed;
    if (this.state === 'alert' && this.lastSeen) {
      target = this.lastSeen;
      speed = this.speed * 1.75;
    } else if (this.state === 'suspicious' && this.lastSeen) {
      target = this.lastSeen;
      if (this.investigateTimer > 0) this.investigateTimer -= dt;
      else this.state = 'patrol';
    } else {
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
      } else {
        target = this.waypoints[this.wp];
        if (dist(this.x, this.y, target.x, target.y) < 8) {
          this.wp = (this.wp + 1) % this.waypoints.length;
          this.pauseTimer = 0.8;
        }
      }
    }

    if (target) {
      const ang = angleTo(this.x, this.y, target.x, target.y);
      this.dir = ang;
      const step = speed * dt;
      const d = dist(this.x, this.y, target.x, target.y);
      const move = Math.min(step, d);
      const nx = this.x + Math.cos(ang) * move;
      const ny = this.y + Math.sin(ang) * move;
      if (!walls.some((w) => pointInRect(nx, this.y, w))) this.x = nx;
      if (!walls.some((w) => pointInRect(this.x, ny, w))) this.y = ny;
    }
    return this.state;
  }
}

export class Dog {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.waypoints = def.waypoints;
    this.speed = def.speed;
    this.wp = 1 % def.waypoints.length;
    this.dir = 0;
    this.state = 'patrol';
    this.suspicion = 0;
    this.lastSeen = null;
    this.radius = 12;
    this.kind = 'dog';
  }

  update(dt, player, covers, walls) {
    const d = dist(this.x, this.y, player.x, player.y);
    const smell = player.sneaking ? DOG_SMELL * 0.5 : DOG_SMELL;
    let rate = 0;
    if (d < smell) {
      // Smell works through cover, but not through walls.
      if (lineOfSight(this.x, this.y, player.x, player.y, walls)) rate = 90;
    } else if (d < DOG_RANGE) {
      const ang = angleTo(this.x, this.y, player.x, player.y);
      if (Math.abs(angleDiff(ang, this.dir)) <= CONE_HALF) {
        if (lineOfSight(this.x, this.y, player.x, player.y, walls)) {
          rate = player.sneaking ? 30 : 70;
        }
      }
    }
    if (rate > 0) {
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.state = this.suspicion >= 100 ? 'alert' : 'suspicious';
    } else {
      this.suspicion = Math.max(0, this.suspicion - 25 * dt);
      if (this.suspicion <= 0) this.state = 'patrol';
    }

    let target = null;
    let speed = this.speed;
    if (this.state === 'alert' && this.lastSeen) {
      target = this.lastSeen;
      speed = this.speed * 1.5;
    } else if (this.state === 'suspicious' && this.lastSeen) {
      target = this.lastSeen;
    } else {
      target = this.waypoints[this.wp];
      if (dist(this.x, this.y, target.x, target.y) < 8) {
        this.wp = (this.wp + 1) % this.waypoints.length;
      }
    }
    if (target) {
      const ang = angleTo(this.x, this.y, target.x, target.y);
      this.dir = ang;
      const step = Math.min(speed * dt, dist(this.x, this.y, target.x, target.y));
      const nx = this.x + Math.cos(ang) * step;
      const ny = this.y + Math.sin(ang) * step;
      if (!walls.some((w) => pointInRect(nx, this.y, w))) this.x = nx;
      if (!walls.some((w) => pointInRect(this.x, ny, w))) this.y = ny;
    }
    return this.state;
  }
}

export class Camera {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.range = def.range;
    this.phase = Math.random() * Math.PI * 2;
    this.dir = def.baseAngle;
    this.spotted = 0; // 0..1, how long the player has been in view
    this.kind = 'camera';
  }

  update(dt, player, walls, onAlarm) {
    this.phase += dt * this.speed;
    this.dir = this.baseAngle + Math.sin(this.phase) * this.sweep;
    const d = dist(this.x, this.y, player.x, player.y);
    let seen = false;
    if (d < this.range) {
      const ang = angleTo(this.x, this.y, player.x, player.y);
      if (Math.abs(angleDiff(ang, this.dir)) <= CONE_HALF) {
        if (lineOfSight(this.x, this.y, player.x, player.y, walls)) seen = true;
      }
    }
    if (seen) {
      this.spotted = Math.min(1, this.spotted + dt * 1.4);
      if (this.spotted >= 1 && onAlarm) onAlarm();
    } else {
      this.spotted = Math.max(0, this.spotted - dt * 0.8);
    }
    return this.spotted;
  }
}
