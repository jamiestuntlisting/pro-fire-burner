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
    this.width = 54;
    this.height = 54;

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
          x: cx + this.dirX * 30,
          y: cy + this.dirY * 30,
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
    const breathe = Math.sin(this.breatheTimer * 2) * 0.9;
    const isWalking = this.aiState === SAFETY_STATE.FOLLOWING || this.aiState === SAFETY_STATE.COOLDOWN;
    const legSwing = isWalking ? Math.sin(this.walkTimer * 8) * 6 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx + 27, sy + 54, 21, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots — heavy armored treads
    ctx.fillStyle = '#111111';
    this._roundRect(ctx, sx + 6, sy + 45 + legSwing * 0.2, 15, 9, 3);
    this._roundRect(ctx, sx + 33, sy + 45 - legSwing * 0.2, 15, 9, 3);
    // Boot sole detail
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(sx + 7, sy + 51 + legSwing * 0.2, 13, 2);
    ctx.fillRect(sx + 34, sy + 51 - legSwing * 0.2, 13, 2);

    // Legs — heavy industrial suit pants
    const legGrad = ctx.createLinearGradient(sx + 9, sy + 33, sx + 45, sy + 48);
    legGrad.addColorStop(0, '#3a3e44');
    legGrad.addColorStop(0.5, '#2e3238');
    legGrad.addColorStop(1, '#24282e');
    ctx.fillStyle = legGrad;
    this._roundRect(ctx, sx + 9, sy + 33 + legSwing * 0.3, 12, 15, 3);
    this._roundRect(ctx, sx + 33, sy + 33 - legSwing * 0.3, 12, 15, 3);
    // Knee armor plates
    ctx.fillStyle = '#1a1e22';
    this._roundRect(ctx, sx + 10, sy + 36 + legSwing * 0.3, 10, 6, 2);
    this._roundRect(ctx, sx + 34, sy + 36 - legSwing * 0.3, 10, 6, 2);

    // Body — heavy industrial mech/hazmat suit
    const suitGrad = ctx.createLinearGradient(sx + 3, sy + 9, sx + 51, sy + 39);
    suitGrad.addColorStop(0, '#44484e');
    suitGrad.addColorStop(0.15, '#3a3e44');
    suitGrad.addColorStop(0.3, '#32363c');
    suitGrad.addColorStop(0.5, '#2a2e34');
    suitGrad.addColorStop(0.7, '#32363c');
    suitGrad.addColorStop(1, '#282c30');
    ctx.fillStyle = suitGrad;
    this._roundRect(ctx, sx + 3, sy + 9 + breathe, 48, 30, 9);

    // Chest armor plate overlay
    ctx.fillStyle = 'rgba(20,22,26,0.5)';
    this._roundRect(ctx, sx + 12, sy + 12 + breathe, 30, 18, 5);

    // Hazard stripes — orange/black industrial
    ctx.fillStyle = '#cc6600';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(sx + 6, sy + 15 + breathe, 42, 3);
    ctx.fillRect(sx + 6, sy + 27 + breathe, 42, 3);
    ctx.globalAlpha = 1;
    // Stripe hash marks
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(sx + 8 + i * 6, sy + 15 + breathe, 2, 3);
      ctx.fillRect(sx + 8 + i * 6, sy + 27 + breathe, 2, 3);
    }

    // Shoulder pads — heavy armored pauldrons
    const shoulderGrad = ctx.createLinearGradient(sx - 3, sy + 9, sx + 12, sy + 21);
    shoulderGrad.addColorStop(0, '#3a3e44');
    shoulderGrad.addColorStop(1, '#22262a');
    ctx.fillStyle = shoulderGrad;
    this._roundRect(ctx, sx - 3, sy + 9 + breathe, 12, 12, 6);
    this._roundRect(ctx, sx + 45, sy + 9 + breathe, 12, 12, 6);
    // Pauldron edge highlights
    ctx.fillStyle = '#555a60';
    ctx.fillRect(sx - 2, sy + 10 + breathe, 10, 1);
    ctx.fillRect(sx + 46, sy + 10 + breathe, 10, 1);

    // Arms — armored sleeves
    ctx.fillStyle = '#2e3238';
    ctx.fillRect(sx - 3, sy + 15 + breathe, 9, 18);
    ctx.fillRect(sx + 48, sy + 15 + breathe, 9, 18);
    // Armored gauntlets
    ctx.fillStyle = '#1a1e22';
    this._roundRect(ctx, sx - 3, sy + 30 + breathe, 9, 6, 3);
    this._roundRect(ctx, sx + 48, sy + 30 + breathe, 9, 6, 3);

    // Backpack / life support unit
    ctx.fillStyle = '#1e2226';
    this._roundRect(ctx, sx + 15, sy + 10 + breathe, 24, 20, 4);
    ctx.fillStyle = '#cc3300';
    ctx.beginPath();
    ctx.arc(sx + 27, sy + 16 + breathe, 3, 0, Math.PI * 2);
    ctx.fill();
    // Vent slats on backpack
    ctx.fillStyle = '#0e1114';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(sx + 18, sy + 22 + breathe + i * 3, 18, 1);
    }

    // Fire extinguisher — industrial suppression unit
    const extOffX = sx + 27 + this.dirX * 24;
    const extOffY = sy + 15 + breathe + this.dirY * 15;

    const extGrad = ctx.createLinearGradient(extOffX - 9, extOffY - 6, extOffX + 9, extOffY + 24);
    extGrad.addColorStop(0, '#881100');
    extGrad.addColorStop(0.3, '#aa2211');
    extGrad.addColorStop(0.5, '#771100');
    extGrad.addColorStop(1, '#550000');
    ctx.fillStyle = extGrad;
    this._roundRect(ctx, extOffX - 9, extOffY - 6, 18, 30, 6);

    // Extinguisher top mechanism
    ctx.fillStyle = '#0a0a0a';
    this._roundRect(ctx, extOffX - 6, extOffY - 12, 12, 9, 3);

    // Pressure gauge
    ctx.fillStyle = '#556655';
    ctx.beginPath();
    ctx.arc(extOffX, extOffY - 9, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#88aa88';
    ctx.beginPath();
    ctx.arc(extOffX, extOffY - 9, 3, 0, Math.PI * 2);
    ctx.fill();

    // Hose — thick industrial
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(extOffX, extOffY - 12);
    ctx.quadraticCurveTo(
      extOffX + this.dirX * 12, extOffY - 18 + this.dirY * 6,
      extOffX + this.dirX * 30, extOffY - 6 + this.dirY * 24
    );
    ctx.stroke();

    const nozzleX = extOffX + this.dirX * 30;
    const nozzleY = extOffY - 6 + this.dirY * 24;
    ctx.fillStyle = '#2a2a2a';
    this._roundRect(ctx, nozzleX - 3, nozzleY - 3, 9, 9, 3);
    // Nozzle tip
    ctx.fillStyle = '#444444';
    this._roundRect(ctx, nozzleX - 1.5 + this.dirX * 4, nozzleY - 1.5 + this.dirY * 4, 6, 6, 2);

    // Helmet — heavy industrial mech helmet
    const hoodGrad = ctx.createRadialGradient(sx + 27, sy + 0, 3, sx + 27, sy + 3, 24);
    hoodGrad.addColorStop(0, '#3a3e44');
    hoodGrad.addColorStop(0.5, '#2a2e34');
    hoodGrad.addColorStop(1, '#1a1e22');
    ctx.fillStyle = hoodGrad;
    this._roundRect(ctx, sx + 9, sy - 9, 36, 24, 12);

    // Helmet ridge / crest
    ctx.fillStyle = '#22262a';
    this._roundRect(ctx, sx + 18, sy - 12, 18, 6, 3);

    // Face shield / visor — dark tinted
    const visorGrad = ctx.createLinearGradient(sx + 12, sy, sx + 42, sy + 12);
    visorGrad.addColorStop(0, '#0a1018');
    visorGrad.addColorStop(0.3, '#142030');
    visorGrad.addColorStop(0.5, '#1a2838');
    visorGrad.addColorStop(0.7, '#142030');
    visorGrad.addColorStop(1, '#0a1018');
    ctx.fillStyle = visorGrad;
    this._roundRect(ctx, sx + 12, sy, 30, 12, 6);

    // Visor glint
    ctx.fillStyle = 'rgba(120,160,200,0.2)';
    this._roundRect(ctx, sx + 15, sy, 12, 3, 1.5);

    // Helmet chin guard
    ctx.fillStyle = '#1e2226';
    this._roundRect(ctx, sx + 15, sy + 10, 24, 6, 3);

    // Spray glow when spraying
    if (this.aiState === SAFETY_STATE.SPRAYING) {
      ctx.fillStyle = 'rgba(150,200,255,0.4)';
      ctx.beginPath();
      ctx.arc(nozzleX + 3, nozzleY + 3, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aiming indicator
    if (this.aiState === SAFETY_STATE.AIMING) {
      const aimFlash = Math.sin(this.aimTimer * 6) > 0;
      if (aimFlash) {
        ctx.fillStyle = 'rgba(255,60,60,0.6)';
        ctx.beginPath();
        ctx.arc(nozzleX + this.dirX * 9, nozzleY + this.dirY * 9, 6, 0, Math.PI * 2);
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
