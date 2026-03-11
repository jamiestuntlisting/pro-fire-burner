import { Entity } from '../engine/Entity.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export class PASwarm extends Entity {
  constructor() {
    super(0, 0);
    this.pas = [];
    this.timer = 0;
    this.duration = 2.5;
    this.phase = 'RUSHING'; // RUSHING, BEATING, DONE
    this.targetX = 0;
    this.targetY = 0;
    this.done = false;
  }

  activate(playerX, playerY, camera) {
    this.targetX = playerX;
    this.targetY = playerY;

    // Spawn 5 PAs from screen edges
    const edgePositions = [
      { x: camera.x - 20, y: playerY },
      { x: camera.x + VIEWPORT_WIDTH + 20, y: playerY },
      { x: playerX, y: camera.y - 20 },
      { x: playerX, y: camera.y + VIEWPORT_HEIGHT + 20 },
      { x: camera.x - 20, y: camera.y - 20 },
    ];

    this.pas = edgePositions.map((pos, i) => ({
      x: pos.x, y: pos.y,
      speed: 200 + i * 20,
      arrived: false,
      swingAngle: 0,
    }));
    this.timer = 0;
    this.phase = 'RUSHING';
  }

  update(dt) {
    this.timer += dt;

    if (this.phase === 'RUSHING') {
      let allArrived = true;
      for (const pa of this.pas) {
        if (pa.arrived) continue;
        const dx = this.targetX - pa.x;
        const dy = this.targetY - pa.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 16) {
          pa.arrived = true;
        } else {
          pa.x += (dx / dist) * pa.speed * dt;
          pa.y += (dy / dist) * pa.speed * dt;
          allArrived = false;
        }
      }
      if (allArrived) {
        this.phase = 'BEATING';
        this.timer = 0;
      }
    }

    if (this.phase === 'BEATING') {
      for (const pa of this.pas) {
        pa.swingAngle += dt * 15;
      }
      if (this.timer >= 2.0) {
        this.phase = 'DONE';
        this.done = true;
      }
    }
  }

  render(ctx, camera) {
    for (const pa of this.pas) {
      const screen = camera.worldToScreen(pa.x, pa.y);
      const sx = Math.floor(screen.x);
      const sy = Math.floor(screen.y);

      // PA body
      ctx.fillStyle = '#222222';
      ctx.fillRect(sx + 2, sy + 4, 12, 10);

      // Head
      ctx.fillStyle = '#eebb88';
      ctx.fillRect(sx + 4, sy, 8, 5);

      // Clipboard
      ctx.fillStyle = '#ddddaa';
      ctx.fillRect(sx + 12, sy + 3, 5, 7);
      ctx.fillStyle = '#333333';
      ctx.fillRect(sx + 13, sy + 5, 3, 1);
      ctx.fillRect(sx + 13, sy + 7, 3, 1);

      // Walkie-talkie swing (during beating)
      if (this.phase === 'BEATING') {
        const swingX = Math.sin(pa.swingAngle) * 6;
        ctx.fillStyle = '#444444';
        ctx.fillRect(sx - 4 + swingX, sy + 2, 4, 8);
        // Antenna
        ctx.fillStyle = '#888888';
        ctx.fillRect(sx - 3 + swingX, sy - 2, 1, 4);
      }

      // Headset wire
      ctx.fillStyle = '#666666';
      ctx.fillRect(sx + 10, sy + 1, 3, 1);
      ctx.fillRect(sx + 12, sy + 1, 1, 3);
    }
  }
}
