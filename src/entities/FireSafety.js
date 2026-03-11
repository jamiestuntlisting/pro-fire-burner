import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, PLAYER_SPEED } from '../constants.js';
import { pointInCone, distance } from '../utils/math.js';

export class FireSafety extends Entity {
  constructor(x, y, facingAngle) {
    super(x, y);
    this.width = 16;
    this.height = 16;

    // Facing direction (angle in radians)
    this.facingAngle = facingAngle || 0;
    this.dirX = Math.cos(this.facingAngle);
    this.dirY = Math.sin(this.facingAngle);

    // Spray cone
    this.sprayRange = TILE_SIZE * 5;
    this.sprayHalfAngle = Math.PI / 6;
    this.spraying = false;
    this.sprayParticleTimer = 0;

    // Track player position for aiming spray
    this.playerX = 0;
    this.playerY = 0;

    // Movement toward player (when player lays down)
    this.moveToTarget = null;
    this.moveSpeed = PLAYER_SPEED * 2;
    this.arriving = false;

    // Spray particle animation
    this.sprayParticles = [];
  }

  setPlayerPosition(px, py) {
    this.playerX = px;
    this.playerY = py;
    // Aim spray toward player
    const dx = px - this.getCenterX();
    const dy = py - this.getCenterY();
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) {
      this.facingAngle = Math.atan2(dy, dx);
      this.dirX = Math.cos(this.facingAngle);
      this.dirY = Math.sin(this.facingAngle);
    }
  }

  isPlayerInSpray(playerX, playerY) {
    return pointInCone(
      playerX, playerY,
      this.getCenterX(), this.getCenterY(),
      this.dirX, this.dirY,
      this.sprayRange, this.sprayHalfAngle
    );
  }

  moveToward(targetX, targetY) {
    this.moveToTarget = { x: targetX, y: targetY };
  }

  update(dt) {
    this.sprayParticleTimer += dt;

    // Update spray particles
    for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
      const p = this.sprayParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.size += dt * 8;
      if (p.life <= 0) this.sprayParticles.splice(i, 1);
    }

    // Emit spray particles toward player
    if (this.sprayParticleTimer > 0.03) {
      this.sprayParticleTimer = 0;
      const cx = this.getCenterX();
      const cy = this.getCenterY();
      const speed = 150 + Math.random() * 80;
      const angleJitter = (Math.random() - 0.5) * 0.4;
      const angle = this.facingAngle + angleJitter;
      this.sprayParticles.push({
        x: cx + this.dirX * 8,
        y: cy + this.dirY * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 1 + Math.random(),
      });
      if (this.sprayParticles.length > 60) {
        this.sprayParticles.shift();
      }
    }

    if (this.moveToTarget) {
      const dx = this.moveToTarget.x - this.getCenterX();
      const dy = this.moveToTarget.y - this.getCenterY();
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 16) {
        this.arriving = true;
        this.moveToTarget = null;
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * this.moveSpeed * dt;
        this.y += ny * this.moveSpeed * dt;
      }
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Draw spray particles (behind the character)
    this._renderSprayParticles(ctx, camera);

    // Draw spray cone (subtle)
    this._renderSprayCone(ctx, camera);

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + 8, sy + 16, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fire safety suit - silver/reflective
    // Legs
    ctx.fillStyle = '#8899aa';
    this._roundRect(ctx, sx + 3, sy + 12, 4, 4, 1);
    this._roundRect(ctx, sx + 9, sy + 12, 4, 4, 1);

    // Boots
    ctx.fillStyle = '#333333';
    this._roundRect(ctx, sx + 3, sy + 14, 4, 2, 1);
    this._roundRect(ctx, sx + 9, sy + 14, 4, 2, 1);

    // Body - silver fire suit with reflective stripes
    const suitGrad = ctx.createLinearGradient(sx + 2, sy + 4, sx + 14, sy + 13);
    suitGrad.addColorStop(0, '#c0c8d0');
    suitGrad.addColorStop(0.3, '#d8dde2');
    suitGrad.addColorStop(0.5, '#aab4be');
    suitGrad.addColorStop(1, '#8899aa');
    ctx.fillStyle = suitGrad;
    this._roundRect(ctx, sx + 2, sy + 4, 12, 9, 2);

    // Reflective stripes (yellow safety stripes)
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(sx + 3, sy + 6, 10, 1);
    ctx.fillRect(sx + 3, sy + 9, 10, 1);

    // Arms in suit
    ctx.fillStyle = '#b0b8c0';
    ctx.fillRect(sx, sy + 5, 3, 6);
    ctx.fillRect(sx + 13, sy + 5, 3, 6);

    // Gloves
    ctx.fillStyle = '#444444';
    ctx.fillRect(sx, sy + 10, 3, 2);
    ctx.fillRect(sx + 13, sy + 10, 3, 2);

    // Fire extinguisher (held by hands, pointing toward spray direction)
    const extAngle = this.facingAngle;
    const extCx = sx + 8 + this.dirX * 6;
    const extCy = sy + 8 + this.dirY * 4;

    // Extinguisher body (red cylinder)
    ctx.fillStyle = '#cc0000';
    this._roundRect(ctx, extCx - 2, extCy - 3, 5, 8, 2);

    // Extinguisher top/nozzle
    ctx.fillStyle = '#222222';
    ctx.fillRect(extCx - 1, extCy - 4, 3, 2);

    // Hose going toward spray direction
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(extCx + 1, extCy - 4);
    ctx.lineTo(extCx + 1 + this.dirX * 6, extCy - 4 + this.dirY * 6);
    ctx.stroke();

    // Head with fire hood/visor
    // Hood (silver)
    ctx.fillStyle = '#b0b8c0';
    this._roundRect(ctx, sx + 3, sy - 1, 10, 7, 3);

    // Visor (dark reflective)
    const visorGrad = ctx.createLinearGradient(sx + 4, sy + 1, sx + 12, sy + 4);
    visorGrad.addColorStop(0, '#224466');
    visorGrad.addColorStop(0.5, '#446688');
    visorGrad.addColorStop(1, '#224466');
    ctx.fillStyle = visorGrad;
    this._roundRect(ctx, sx + 4, sy + 1, 8, 3, 1);

    // Visor reflection shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(sx + 5, sy + 1, 3, 1);

    ctx.restore();
  }

  _renderSprayParticles(ctx, camera) {
    ctx.save();
    for (const p of this.sprayParticles) {
      const screen = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, (p.life / p.maxLife) * 0.6);
      ctx.globalAlpha = alpha;

      // White-blue misty spray
      const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, p.size * 2);
      grad.addColorStop(0, 'rgba(200,230,255,0.8)');
      grad.addColorStop(0.5, 'rgba(150,200,240,0.4)');
      grad.addColorStop(1, 'rgba(100,180,230,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderSprayCone(ctx, camera) {
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const screen = camera.worldToScreen(cx, cy);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#aaddff';
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);

    const angle1 = this.facingAngle - this.sprayHalfAngle;
    const angle2 = this.facingAngle + this.sprayHalfAngle;
    const range = this.sprayRange * camera.zoom;

    ctx.lineTo(
      screen.x + Math.cos(angle1) * range,
      screen.y + Math.sin(angle1) * range
    );
    ctx.lineTo(
      screen.x + Math.cos(angle2) * range,
      screen.y + Math.sin(angle2) * range
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
}
