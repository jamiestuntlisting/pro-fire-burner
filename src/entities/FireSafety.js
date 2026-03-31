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
    this.width = 28;
    this.height = 52;

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
    this.aimDelay = 0.15 + Math.random() * 0.1; // Very fast reaction
    this.sprayTimer = 0;
    this.sprayDuration = 3.0; // 3 second spray burst
    this.cooldownTimer = 0;
    this.cooldownDuration = 2.0 + Math.random() * 1.5;
    this.followDistance = TILE_SIZE * 4;
    this.followSpeed = PLAYER_SPEED * 0.12; // Very slow movement

    // Track player position
    this.playerX = 0;
    this.playerY = 0;

    // Movement toward player (when player lays down)
    this.moveToTarget = null;
    this.moveSpeed = PLAYER_SPEED * 0.5; // Moderate rush to downed performer
    this.arriving = false;
    this.rushSprayDuration = 5.0; // Spray for 5 seconds on downed performer

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
      this.facingAngle += diff * 0.02;
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

    if (dist > 1) {
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

    // Override AI for lay-down rush (downed performer)
    if (this.moveToTarget) {
      const dx = this.moveToTarget.x - this.getCenterX();
      const dy = this.moveToTarget.y - this.getCenterY();
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 16) {
        this.arriving = true;
        this.moveToTarget = null;
        // Start long 5-second spray on downed performer
        this.aiState = SAFETY_STATE.SPRAYING;
        this.sprayTimer = 0;
        this._currentSprayDuration = this.rushSprayDuration;
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

    // Check if player just ran into spray cone - reactive spray
    const playerInCone = pointInCone(
      this.playerX, this.playerY,
      this.getCenterX(), this.getCenterY(),
      this.dirX, this.dirY,
      this.sprayRange, this.sprayHalfAngle
    );

    switch (this.aiState) {
      case SAFETY_STATE.PATROLLING:
        this._aimAtPlayer();
        // If player runs in front of the extinguisher, react fast
        if (playerInCone && distToPlayer < this.sprayRange * 0.9) {
          this.aiState = SAFETY_STATE.AIMING;
          this.aimTimer = 0;
        } else if (distToPlayer < TILE_SIZE * 10) {
          this.aiState = SAFETY_STATE.FOLLOWING;
        }
        break;

      case SAFETY_STATE.FOLLOWING:
        this._aimAtPlayer();
        this._followPlayer(dt);
        if (playerInCone && distToPlayer < this.sprayRange * 0.9) {
          this.aiState = SAFETY_STATE.AIMING;
          this.aimTimer = 0;
        } else if (distToPlayer < this.sprayRange * 0.8) {
          this.aiState = SAFETY_STATE.AIMING;
          this.aimTimer = 0;
        }
        break;

      case SAFETY_STATE.AIMING:
        this._aimAtPlayer();
        this.aimTimer += dt;
        if (this.aimTimer >= this.aimDelay) {
          this.aiState = SAFETY_STATE.SPRAYING;
          this.sprayTimer = 0;
          this._currentSprayDuration = this.sprayDuration;
        }
        if (distToPlayer > this.sprayRange * 1.5) {
          this.aiState = SAFETY_STATE.FOLLOWING;
        }
        break;

      case SAFETY_STATE.SPRAYING:
        this._aimAtPlayer();
        this.sprayTimer += dt;
        this._emitSprayParticles();
        if (this.sprayTimer >= (this._currentSprayDuration || this.sprayDuration)) {
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
          this.aimDelay = 0.5 + Math.random() * 0.5;
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
          x: cx + this.dirX * 20,
          y: cy + this.dirY * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          size: 4.5 + Math.random() * 4.5,
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
    const cx = sx + 14;
    const breathe = Math.sin(this.breatheTimer * 2) * 0.8;
    const isWalking = this.aiState === SAFETY_STATE.FOLLOWING || this.aiState === SAFETY_STATE.COOLDOWN;
    const legSwing = isWalking ? Math.sin(this.walkTimer * 8) * 4 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 52, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = '#111111';
    this._roundRect(ctx, sx + 2, sy + 44 + legSwing * 0.2, 8, 7, 2);
    this._roundRect(ctx, sx + 18, sy + 44 - legSwing * 0.2, 8, 7, 2);

    // Legs - slim industrial pants
    const legGrad = ctx.createLinearGradient(sx + 3, sy + 32, sx + 25, sy + 46);
    legGrad.addColorStop(0, '#3a3e44');
    legGrad.addColorStop(1, '#24282e');
    ctx.fillStyle = legGrad;
    this._roundRect(ctx, sx + 3, sy + 32 + legSwing * 0.3, 7, 14, 2);
    this._roundRect(ctx, sx + 18, sy + 32 - legSwing * 0.3, 7, 14, 2);
    // Knee plates
    ctx.fillStyle = '#1a1e22';
    this._roundRect(ctx, sx + 4, sy + 35 + legSwing * 0.3, 5, 4, 1);
    this._roundRect(ctx, sx + 19, sy + 35 - legSwing * 0.3, 5, 4, 1);

    // Body - slim hazmat suit
    const suitGrad = ctx.createLinearGradient(sx, sy + 12, sx + 28, sy + 36);
    suitGrad.addColorStop(0, '#44484e');
    suitGrad.addColorStop(0.5, '#2a2e34');
    suitGrad.addColorStop(1, '#282c30');
    ctx.fillStyle = suitGrad;
    this._roundRect(ctx, sx, sy + 12 + breathe, 28, 22, 5);

    // Hazard stripes
    ctx.fillStyle = '#cc6600';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(sx + 2, sy + 17 + breathe, 24, 2);
    ctx.fillRect(sx + 2, sy + 27 + breathe, 24, 2);
    ctx.globalAlpha = 1;
    // Stripe hash marks
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(sx + 4 + i * 6, sy + 17 + breathe, 2, 2);
      ctx.fillRect(sx + 4 + i * 6, sy + 27 + breathe, 2, 2);
    }

    // Shoulder pads
    ctx.fillStyle = '#3a3e44';
    this._roundRect(ctx, sx - 3, sy + 12 + breathe, 7, 8, 3);
    this._roundRect(ctx, sx + 24, sy + 12 + breathe, 7, 8, 3);

    // Arms - slim
    ctx.fillStyle = '#2e3238';
    this._roundRect(ctx, sx - 2, sy + 17 + breathe, 5, 14, 1);
    this._roundRect(ctx, sx + 25, sy + 17 + breathe, 5, 14, 1);
    // Gauntlets
    ctx.fillStyle = '#1a1e22';
    this._roundRect(ctx, sx - 2, sy + 29 + breathe, 5, 4, 2);
    this._roundRect(ctx, sx + 25, sy + 29 + breathe, 5, 4, 2);

    // Fire extinguisher - held to one side
    const extOffX = cx + this.dirX * 16;
    const extOffY = sy + 18 + breathe + this.dirY * 10;

    const extGrad = ctx.createLinearGradient(extOffX - 5, extOffY - 4, extOffX + 5, extOffY + 16);
    extGrad.addColorStop(0, '#aa2211');
    extGrad.addColorStop(1, '#550000');
    ctx.fillStyle = extGrad;
    this._roundRect(ctx, extOffX - 5, extOffY - 4, 10, 20, 3);
    // Top mechanism
    ctx.fillStyle = '#0a0a0a';
    this._roundRect(ctx, extOffX - 3, extOffY - 8, 6, 6, 2);

    // Hose
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(extOffX, extOffY - 8);
    ctx.quadraticCurveTo(
      extOffX + this.dirX * 8, extOffY - 12 + this.dirY * 4,
      extOffX + this.dirX * 20, extOffY - 4 + this.dirY * 16
    );
    ctx.stroke();

    const nozzleX = extOffX + this.dirX * 20;
    const nozzleY = extOffY - 4 + this.dirY * 16;
    ctx.fillStyle = '#2a2a2a';
    this._roundRect(ctx, nozzleX - 2, nozzleY - 2, 5, 5, 2);

    // Neck
    ctx.fillStyle = '#22262a';
    ctx.fillRect(sx + 9, sy + 7 + breathe, 10, 6);

    // Helmet - proportional
    const hoodGrad = ctx.createRadialGradient(cx, sy + 2, 2, cx, sy + 4, 14);
    hoodGrad.addColorStop(0, '#3a3e44');
    hoodGrad.addColorStop(0.5, '#2a2e34');
    hoodGrad.addColorStop(1, '#1a1e22');
    ctx.fillStyle = hoodGrad;
    this._roundRect(ctx, sx + 2, sy - 6, 24, 18, 8);

    // Helmet crest
    ctx.fillStyle = '#22262a';
    this._roundRect(ctx, sx + 7, sy - 8, 14, 4, 2);

    // Visor
    const visorGrad = ctx.createLinearGradient(sx + 4, sy + 1, sx + 24, sy + 9);
    visorGrad.addColorStop(0, '#0a1018');
    visorGrad.addColorStop(0.5, '#1a2838');
    visorGrad.addColorStop(1, '#0a1018');
    ctx.fillStyle = visorGrad;
    this._roundRect(ctx, sx + 4, sy + 1, 20, 8, 4);
    // Visor glint
    ctx.fillStyle = 'rgba(120,160,200,0.2)';
    this._roundRect(ctx, sx + 6, sy + 2, 8, 2, 1);

    // Chin guard
    ctx.fillStyle = '#1e2226';
    this._roundRect(ctx, sx + 6, sy + 8, 16, 4, 2);

    // Spray glow when spraying
    if (this.aiState === SAFETY_STATE.SPRAYING) {
      ctx.fillStyle = 'rgba(150,200,255,0.4)';
      ctx.beginPath();
      ctx.arc(nozzleX + 2, nozzleY + 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aiming indicator
    if (this.aiState === SAFETY_STATE.AIMING) {
      const aimFlash = Math.sin(this.aimTimer * 6) > 0;
      if (aimFlash) {
        ctx.fillStyle = 'rgba(255,60,60,0.6)';
        ctx.beginPath();
        ctx.arc(nozzleX + this.dirX * 6, nozzleY + this.dirY * 6, 4, 0, Math.PI * 2);
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
