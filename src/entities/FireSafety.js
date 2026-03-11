import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, PLAYER_SPEED } from '../constants.js';
import { pointInCone, distance } from '../utils/math.js';

const SAFETY_STATE = {
  PATROLLING: 'PATROLLING',
  FOLLOWING: 'FOLLOWING',
  AIMING: 'AIMING',
  SPRAYING: 'SPRAYING',
  COOLDOWN: 'COOLDOWN',
};

export class FireSafety extends Entity {
  constructor(x, y, facingAngle) {
    super(x, y);
    this.width = 18;
    this.height = 18;

    // Facing direction (angle in radians)
    this.facingAngle = facingAngle || 0;
    this.dirX = Math.cos(this.facingAngle);
    this.dirY = Math.sin(this.facingAngle);

    // Spray cone
    this.sprayRange = TILE_SIZE * 5;
    this.sprayHalfAngle = Math.PI / 6;

    // AI state machine
    this.aiState = SAFETY_STATE.PATROLLING;
    this.aimTimer = 0;
    this.aimDelay = 1.2 + Math.random() * 0.8;
    this.sprayTimer = 0;
    this.sprayDuration = 1.5 + Math.random() * 1.0;
    this.cooldownTimer = 0;
    this.cooldownDuration = 2.0 + Math.random() * 1.5;
    this.followDistance = TILE_SIZE * 4;
    this.followSpeed = PLAYER_SPEED * 0.6;

    // Track player position
    this.playerX = 0;
    this.playerY = 0;

    // Movement toward player (when player lays down)
    this.moveToTarget = null;
    this.moveSpeed = PLAYER_SPEED * 2;
    this.arriving = false;

    // Spray particle animation
    this.sprayParticles = [];
    this.sprayParticleTimer = 0;

    // Walk animation
    this.walkTimer = 0;
    this.breatheTimer = Math.random() * Math.PI * 2;

    // Fuel drain rate when spraying on player (per second)
    this.fuelDrainRate = 25;
  }

  setPlayerPosition(px, py) {
    this.playerX = px;
    this.playerY = py;
  }

  isPlayerInSpray(playerX, playerY) {
    if (this.aiState !== SAFETY_STATE.SPRAYING) return false;
    return pointInCone(
      playerX, playerY,
      this.getCenterX(), this.getCenterY(),
      this.dirX, this.dirY,
      this.sprayRange, this.sprayHalfAngle
    );
  }

  isSpraying() {
    return this.aiState === SAFETY_STATE.SPRAYING;
  }

  moveToward(targetX, targetY) {
    this.moveToTarget = { x: targetX, y: targetY };
  }

  _aimAtPlayer() {
    const dx = this.playerX - this.getCenterX();
    const dy = this.playerY - this.getCenterY();
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - this.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingAngle += diff * 0.08;
      this.dirX = Math.cos(this.facingAngle);
      this.dirY = Math.sin(this.facingAngle);
    }
  }

  _followPlayer(dt) {
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const dx = this.playerX - cx;
    const dy = this.playerY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.followDistance) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.followSpeed * dt;
      this.y += ny * this.followSpeed * dt;
      this.walkTimer += dt;
    }
  }

  update(dt) {
    this.breatheTimer += dt;
    this.sprayParticleTimer += dt;

    // Update spray particles
    for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
      const p = this.sprayParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.size += dt * 10;
      p.vy += dt * 20;
      if (p.life <= 0) this.sprayParticles.splice(i, 1);
    }

    // Override AI for lay-down rush
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
        this.walkTimer += dt;
      }
      this._aimAtPlayer();
      return;
    }

    // AI state machine
    const distToPlayer = distance(this.getCenterX(), this.getCenterY(), this.playerX, this.playerY);

    switch (this.aiState) {
      case SAFETY_STATE.PATROLLING:
        this._aimAtPlayer();
        if (distToPlayer < TILE_SIZE * 10) {
          this.aiState = SAFETY_STATE.FOLLOWING;
        }
        break;

      case SAFETY_STATE.FOLLOWING:
        this._aimAtPlayer();
        this._followPlayer(dt);
        if (distToPlayer < this.sprayRange * 0.8) {
          this.aiState = SAFETY_STATE.AIMING;
          this.aimTimer = 0;
        }
        break;

      case SAFETY_STATE.AIMING:
        this._aimAtPlayer();
        this._followPlayer(dt);
        this.aimTimer += dt;
        if (this.aimTimer >= this.aimDelay) {
          this.aiState = SAFETY_STATE.SPRAYING;
          this.sprayTimer = 0;
        }
        if (distToPlayer > this.sprayRange) {
          this.aiState = SAFETY_STATE.FOLLOWING;
        }
        break;

      case SAFETY_STATE.SPRAYING:
        this._aimAtPlayer();
        this.sprayTimer += dt;
        this._emitSprayParticles();
        if (this.sprayTimer >= this.sprayDuration) {
          this.aiState = SAFETY_STATE.COOLDOWN;
          this.cooldownTimer = 0;
        }
        break;

      case SAFETY_STATE.COOLDOWN:
        this._aimAtPlayer();
        this._followPlayer(dt);
        this.cooldownTimer += dt;
        if (this.cooldownTimer >= this.cooldownDuration) {
          this.aiState = SAFETY_STATE.FOLLOWING;
          this.aimDelay = 1.0 + Math.random() * 1.0;
          this.sprayDuration = 1.2 + Math.random() * 1.0;
        }
        break;
    }
  }

  _emitSprayParticles() {
    if (this.sprayParticleTimer > 0.02) {
      this.sprayParticleTimer = 0;
      const cx = this.getCenterX();
      const cy = this.getCenterY();
      for (let i = 0; i < 3; i++) {
        const speed = 140 + Math.random() * 100;
        const angleJitter = (Math.random() - 0.5) * 0.5;
        const angle = this.facingAngle + angleJitter;
        this.sprayParticles.push({
          x: cx + this.dirX * 10,
          y: cy + this.dirY * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          size: 1.5 + Math.random() * 1.5,
        });
      }
      if (this.sprayParticles.length > 100) {
        this.sprayParticles.splice(0, 20);
      }
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Draw spray particles first
    this._renderSprayParticles(ctx, camera);

    // Draw spray cone when spraying or aiming
    if (this.aiState === SAFETY_STATE.SPRAYING || this.aiState === SAFETY_STATE.AIMING) {
      this._renderSprayCone(ctx, camera);
    }

    ctx.save();
    const breathe = Math.sin(this.breatheTimer * 2) * 0.3;
    const isWalking = this.aiState === SAFETY_STATE.FOLLOWING || this.aiState === SAFETY_STATE.COOLDOWN;
    const legSwing = isWalking ? Math.sin(this.walkTimer * 8) * 2 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + 9, sy + 18, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = '#222222';
    this._roundRect(ctx, sx + 2, sy + 15 + legSwing * 0.2, 5, 3, 1);
    this._roundRect(ctx, sx + 11, sy + 15 - legSwing * 0.2, 5, 3, 1);

    // Legs in fire suit
    const legGrad = ctx.createLinearGradient(sx + 3, sy + 11, sx + 15, sy + 16);
    legGrad.addColorStop(0, '#a0a8b0');
    legGrad.addColorStop(1, '#808890');
    ctx.fillStyle = legGrad;
    this._roundRect(ctx, sx + 3, sy + 11 + legSwing * 0.3, 4, 5, 1);
    this._roundRect(ctx, sx + 11, sy + 11 - legSwing * 0.3, 4, 5, 1);

    // Body - aluminized fire proximity suit
    const suitGrad = ctx.createLinearGradient(sx + 1, sy + 3, sx + 17, sy + 13);
    suitGrad.addColorStop(0, '#c8d0d8');
    suitGrad.addColorStop(0.15, '#e0e4e8');
    suitGrad.addColorStop(0.3, '#d0d8e0');
    suitGrad.addColorStop(0.5, '#b8c0c8');
    suitGrad.addColorStop(0.7, '#d0d8e0');
    suitGrad.addColorStop(1, '#a0a8b0');
    ctx.fillStyle = suitGrad;
    this._roundRect(ctx, sx + 1, sy + 3 + breathe, 16, 10, 3);

    // Reflective safety stripes
    ctx.fillStyle = '#ccff00';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 2, sy + 5 + breathe, 14, 1);
    ctx.fillRect(sx + 2, sy + 9 + breathe, 14, 1);
    ctx.globalAlpha = 1;

    // Shoulder pads
    ctx.fillStyle = '#b0b8c0';
    this._roundRect(ctx, sx - 1, sy + 3 + breathe, 4, 4, 2);
    this._roundRect(ctx, sx + 15, sy + 3 + breathe, 4, 4, 2);

    // Arms
    const armColor = '#a8b0b8';
    ctx.fillStyle = armColor;
    ctx.fillRect(sx - 1, sy + 5 + breathe, 3, 6);
    ctx.fillRect(sx + 16, sy + 5 + breathe, 3, 6);
    ctx.fillStyle = '#333333';
    this._roundRect(ctx, sx - 1, sy + 10 + breathe, 3, 2, 1);
    this._roundRect(ctx, sx + 16, sy + 10 + breathe, 3, 2, 1);

    // Fire extinguisher
    const extOffX = sx + 9 + this.dirX * 8;
    const extOffY = sy + 5 + breathe + this.dirY * 5;

    const extGrad = ctx.createLinearGradient(extOffX - 3, extOffY - 2, extOffX + 3, extOffY + 8);
    extGrad.addColorStop(0, '#ee2200');
    extGrad.addColorStop(0.3, '#ff4422');
    extGrad.addColorStop(0.5, '#dd1100');
    extGrad.addColorStop(1, '#aa0000');
    ctx.fillStyle = extGrad;
    this._roundRect(ctx, extOffX - 3, extOffY - 2, 6, 10, 2);

    ctx.fillStyle = '#111111';
    this._roundRect(ctx, extOffX - 2, extOffY - 4, 4, 3, 1);

    ctx.fillStyle = '#88aa88';
    ctx.beginPath();
    ctx.arc(extOffX, extOffY - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Hose
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(extOffX, extOffY - 4);
    ctx.quadraticCurveTo(
      extOffX + this.dirX * 4, extOffY - 6 + this.dirY * 2,
      extOffX + this.dirX * 10, extOffY - 2 + this.dirY * 8
    );
    ctx.stroke();

    const nozzleX = extOffX + this.dirX * 10;
    const nozzleY = extOffY - 2 + this.dirY * 8;
    ctx.fillStyle = '#444444';
    this._roundRect(ctx, nozzleX - 1, nozzleY - 1, 3, 3, 1);

    // Fire hood/helmet
    const hoodGrad = ctx.createRadialGradient(sx + 9, sy + 0, 1, sx + 9, sy + 1, 8);
    hoodGrad.addColorStop(0, '#d8dde2');
    hoodGrad.addColorStop(0.5, '#c0c8d0');
    hoodGrad.addColorStop(1, '#a0a8b0');
    ctx.fillStyle = hoodGrad;
    this._roundRect(ctx, sx + 3, sy - 3, 12, 8, 4);

    // Face shield
    const visorGrad = ctx.createLinearGradient(sx + 4, sy, sx + 14, sy + 4);
    visorGrad.addColorStop(0, '#2a3040');
    visorGrad.addColorStop(0.3, '#3a4860');
    visorGrad.addColorStop(0.5, '#4a5870');
    visorGrad.addColorStop(0.7, '#3a4860');
    visorGrad.addColorStop(1, '#2a3040');
    ctx.fillStyle = visorGrad;
    this._roundRect(ctx, sx + 4, sy, 10, 4, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    this._roundRect(ctx, sx + 5, sy, 4, 1, 0.5);

    // Spray glow when spraying
    if (this.aiState === SAFETY_STATE.SPRAYING) {
      ctx.fillStyle = 'rgba(200,230,255,0.4)';
      ctx.beginPath();
      ctx.arc(nozzleX + 1, nozzleY + 1, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aiming indicator
    if (this.aiState === SAFETY_STATE.AIMING) {
      const aimFlash = Math.sin(this.aimTimer * 6) > 0;
      if (aimFlash) {
        ctx.fillStyle = 'rgba(255,100,100,0.5)';
        ctx.beginPath();
        ctx.arc(nozzleX + this.dirX * 3, nozzleY + this.dirY * 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _renderSprayParticles(ctx, camera) {
    if (this.sprayParticles.length === 0) return;
    ctx.save();
    for (const p of this.sprayParticles) {
      const screen = camera.worldToScreen(p.x, p.y);
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio * 0.5);

      ctx.globalAlpha = alpha * 0.3;
      const glowGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, p.size * 3);
      glowGrad.addColorStop(0, 'rgba(220,240,255,0.6)');
      glowGrad.addColorStop(1, 'rgba(180,210,240,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha;
      const coreGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, p.size * 1.5);
      coreGrad.addColorStop(0, 'rgba(240,248,255,0.9)');
      coreGrad.addColorStop(0.4, 'rgba(200,230,255,0.6)');
      coreGrad.addColorStop(1, 'rgba(150,200,240,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.size * 1.5, 0, Math.PI * 2);
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
    const isSpraying = this.aiState === SAFETY_STATE.SPRAYING;
    ctx.globalAlpha = isSpraying ? 0.12 : 0.05;
    ctx.fillStyle = isSpraying ? '#88ccff' : '#aaddff';
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);

    const angle1 = this.facingAngle - this.sprayHalfAngle;
    const angle2 = this.facingAngle + this.sprayHalfAngle;
    const range = this.sprayRange * camera.zoom;

    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = angle1 + (angle2 - angle1) * (i / steps);
      ctx.lineTo(
        screen.x + Math.cos(a) * range,
        screen.y + Math.sin(a) * range
      );
    }
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
