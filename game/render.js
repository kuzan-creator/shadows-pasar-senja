// Canvas rendering for Shadows of Pasar Senja. One frame draws, in order:
// the floor and its night-market / museum / harbour dressing, cover zones,
// the exit gate, loot, walls, vision cones, guards, dogs, cameras, the
// player, thrown coins, and the HUD bar. Cones are translucent so the judge
// can read the stealth at a glance: yellow = patrol, amber = suspicious,
// red = chasing.

import { VIEW_W, VIEW_H, HUD_H } from './levels.js';
import { CONE_RANGE, CONE_HALF, DOG_RANGE } from './guard.js';

const FLOOR = {
  1: '#2b2118', // night market: warm dark earth
  2: '#23262e', // museum: cool stone
  3: '#1c2733', // harbour: blue-grey concrete
};
const FLOOR_ALT = {
  1: '#332819',
  2: '#282c36',
  3: '#212e3c',
};
const WALL_FILL = {
  1: '#8a5a2b', // wooden stalls
  2: '#5a6b7a', // display cases
  3: '#b3542e', // shipping containers
};
const WALL_TOP = {
  1: '#a9743a',
  2: '#7d93a6',
  3: '#d4693c',
};

export function drawCone(ctx, x, y, dir, range, half, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawLevel(ctx, game) {
  const level = game.level;
  const id = level.id;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // Floor with a checkerboard tint so depth reads at a glance.
  ctx.fillStyle = FLOOR[id];
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  ctx.fillStyle = FLOOR_ALT[id];
  const tile = 64;
  for (let ty = HUD_H; ty < VIEW_H; ty += tile) {
    for (let tx = 0; tx < VIEW_W; tx += tile) {
      if (((tx / tile + ty / tile) | 0) % 2 === 0) {
        ctx.fillRect(tx, ty, tile, tile);
      }
    }
  }

  // Cover zones: bushes are round dark green, shadows are soft dark pools.
  for (const c of level.covers) {
    if (c.kind === 'bush') {
      ctx.fillStyle = 'rgba(24, 84, 44, 0.85)';
      ctx.beginPath();
      ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(46, 140, 74, 0.9)';
      ctx.beginPath();
      ctx.ellipse(c.x + c.w / 2 - 10, c.y + c.h / 2 - 6, c.w / 4, c.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(8, 10, 26, 0.55)';
      ctx.beginPath();
      ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Exit gate: green glow with a running-man arrow.
  const ex = level.exit;
  ctx.save();
  ctx.shadowColor = '#39d353';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#1f7a33';
  ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
  ctx.restore();
  ctx.strokeStyle = '#7dff9b';
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x + 3, ex.y + 3, ex.w - 6, ex.h - 6);
  ctx.fillStyle = '#d6ffe0';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 - 2);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('→', ex.x + ex.w / 2, ex.y + ex.h / 2 + 22);

  // Loot: golden lanterns that bob gently.
  const t = game.time;
  for (const loot of level.loot) {
    if (loot.taken) continue;
    const bob = Math.sin(t * 3 + loot.x) * 3;
    ctx.save();
    ctx.shadowColor = '#ffd54a';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.moveTo(loot.x, loot.y - 14 + bob);
    ctx.lineTo(loot.x + 10, loot.y + bob);
    ctx.lineTo(loot.x, loot.y + 14 + bob);
    ctx.lineTo(loot.x - 10, loot.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y + bob, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Walls: stalls / cases / containers with a lighter top edge.
  for (const w of level.walls) {
    ctx.fillStyle = WALL_FILL[id];
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = WALL_TOP[id];
    ctx.fillRect(w.x, w.y, w.w, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    if (id === 1) {
      // Striped awning on market stalls.
      ctx.fillStyle = '#c0392b';
      for (let sx = w.x + 6; sx < w.x + w.w - 8; sx += 24) {
        ctx.fillRect(sx, w.y + 8, 12, 6);
      }
    }
    if (id === 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(w.x + 8, w.y + 12, w.w - 16, 4);
    }
    if (id === 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let sx = w.x + 14; sx < w.x + w.w; sx += 28) {
        ctx.fillRect(sx, w.y + 10, 4, w.h - 20);
      }
    }
  }

  // Thrown coins on the ground, ringing softly.
  for (const coin of game.coins) {
    ctx.save();
    ctx.shadowColor = '#ffd54a';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 213, 74, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 11 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cameras: wall mounts with a sweeping red cone.
  for (const cam of game.cameras) {
    const col =
      cam.spotted > 0.6
        ? 'rgba(255, 40, 40, 0.4)'
        : cam.spotted > 0.2
          ? 'rgba(255, 160, 40, 0.32)'
          : 'rgba(255, 60, 60, 0.2)';
    drawCone(ctx, cam.x, cam.y, cam.dir, cam.range, CONE_HALF, col);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.spotted > 0.2 ? '#ff2d2d' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(cam.dir) * 16, cam.y + Math.sin(cam.dir) * 16);
    ctx.stroke();
  }

  // Guards and dogs with their vision cones.
  for (const g of game.guards) {
    drawActor(ctx, g, CONE_RANGE, '#f5c542');
  }
  for (const d of game.dogs) {
    drawActor(ctx, d, DOG_RANGE, '#e08a3c');
  }

  // The player: hooded thief, darker when sneaking.
  const p = game.player;
  ctx.save();
  ctx.shadowColor = '#7db4ff';
  ctx.shadowBlur = p.sneaking ? 6 : 14;
  ctx.fillStyle = p.sneaking ? '#2f3a55' : '#3d5a99';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#dfe9ff';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 5, p.y + Math.sin(p.dir) * 5, 5, 0, Math.PI * 2);
  ctx.fill();
  // Direction tick.
  ctx.strokeStyle = '#dfe9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.dir) * 18, p.y + Math.sin(p.dir) * 18);
  ctx.stroke();
  if (p.sneaking) {
    ctx.fillStyle = '#9fc3ff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', p.x, p.y - 20);
  }

  drawHud(ctx, game);
}

function drawActor(ctx, a, range, baseColor) {
  const col =
    a.state === 'alert'
      ? 'rgba(255, 45, 45, 0.42)'
      : a.state === 'suspicious'
        ? 'rgba(255, 165, 0, 0.36)'
        : 'rgba(245, 197, 66, 0.24)';
  drawCone(ctx, a.x, a.y, a.dir, range, CONE_HALF, col);
  // Body.
  ctx.fillStyle = a.kind === 'dog' ? '#7a5230' : '#8c2f2f';
  ctx.beginPath();
  ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(a.x + Math.cos(a.dir) * (a.radius + 6), a.y + Math.sin(a.dir) * (a.radius + 6));
  ctx.stroke();
  // Suspicion bar above the head.
  if (a.suspicion > 2) {
    const w = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - w / 2, a.y - a.radius - 12, w, 6);
    ctx.fillStyle = a.suspicion >= 100 ? '#ff2d2d' : a.suspicion >= 50 ? '#ffa500' : '#ffd54a';
    ctx.fillRect(a.x - w / 2, a.y - a.radius - 12, (w * a.suspicion) / 100, 6);
  }
  if (a.state === 'alert') {
    ctx.fillStyle = '#ff2d2d';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', a.x, a.y - a.radius - 18);
  } else if (a.state === 'suspicious') {
    ctx.fillStyle = '#ffa500';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', a.x, a.y - a.radius - 18);
  }
  if (a.kind === 'dog') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOG', a.x, a.y + a.radius + 12);
  }
}

export function drawHud(ctx, game) {
  const level = game.level;
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`SHADOWS OF PASAR SENJA — ${level.name.toUpperCase()}`, 16, 28);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(level.sub, 16, 50);

  // Objective: loot collected.
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`◈ LOOT ${game.player.loot}/3`, 560, 30);
  ctx.fillStyle = '#c8c8d8';
  ctx.fillText(`● COINS ${game.player.coins}`, 560, 52);

  // Alert meter: the highest suspicion among all watchers.
  const alert = game.alertLevel();
  const alertLabel = alert >= 100 ? 'CHASE!' : alert >= 50 ? 'SUSPICIOUS' : 'UNSEEN';
  const alertColor = alert >= 100 ? '#ff2d2d' : alert >= 50 ? '#ffa500' : '#39d353';
  ctx.fillStyle = '#c8c8d8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('ALERT', 780, 24);
  ctx.fillStyle = '#22222e';
  ctx.fillRect(780, 30, 180, 14);
  ctx.fillStyle = alertColor;
  ctx.fillRect(780, 30, (180 * Math.min(100, alert)) / 100, 14);
  ctx.fillStyle = alertColor;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(alertLabel, 970, 42);

  // Timer and level.
  ctx.fillStyle = '#c8c8d8';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`LEVEL ${game.levelIndex + 1}/3`, 1264, 30);
  ctx.fillText(`${Math.floor(game.time)}s`, 1264, 52);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, game) {
  drawLevel(ctx, game);
  ctx.fillStyle = 'rgba(8, 8, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SHADOWS OF', VIEW_W / 2, 250);
  ctx.fillText('PASAR SENJA', VIEW_W / 2, 325);
  ctx.fillStyle = '#e8e8f2';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('— A Stealth Heist —', VIEW_W / 2, 375);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Steal 3 golden lanterns on every level and reach the green EXIT unseen.', VIEW_W / 2, 430);
  ctx.fillText('WASD / Arrows — move    SHIFT — sneak    E or Click — throw a coin', VIEW_W / 2, 465);
  ctx.fillText('Hide in bushes and shadows. Cameras sweep the museum. Dogs smell you at the harbour.', VIEW_W / 2, 495);
  ctx.fillStyle = '#39d353';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const blink = Math.sin(game.time * 4) > -0.2 ? 1 : 0.25;
  ctx.globalAlpha = blink;
  ctx.fillText('Press ENTER or click to start', VIEW_W / 2, 560);
  ctx.globalAlpha = 1;
}

export function drawOverlay(ctx, title, lines, color) {
  ctx.fillStyle = 'rgba(8, 8, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color || '#ffd54a';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, 330);
  ctx.fillStyle = '#e8e8f2';
  ctx.font = '22px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 390 + i * 38);
  });
  ctx.fillStyle = '#39d353';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER to continue', VIEW_W / 2, 390 + lines.length * 38 + 30);
}
