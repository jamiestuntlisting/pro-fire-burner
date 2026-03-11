import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, FOV_GRACE_PERIOD, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import { pointInCone, distance } from '../utils/math.js';

export class FilmCamera extends Entity {
  constructor(x, y, config) {
    super(x, y);
    this.width = 48;
    this.height = 48;

    // Pan (rotation) instead of dolly (translation) - camera stays in place and pans
    this.panSpeed = ((config && config.cameraPanSpeed) || 30) * 0.008;
    this.panDirection = 1;
    this.panAngleRange = ((config && config.cameraFOV) || 70) * (Math.PI / 360);

    this.fovAngle = ((config && config.cameraFOV) || 70) * (Math.PI / 180);
    this.fovRange = TILE_SIZE * 30;
    this.facingAngle = Math.PI / 2; // Default facing down
    this.baseFacingAngle = Math.PI / 2;

    this.playerInFOV = true;
    this.offCameraTimer = 0;

    this.lensFlashTimer = 0;
    this.reelRotation = 0;
    this.recordingPulse = 0;

    // Camera catches fire
    this.onFire = false;
    this.onFireTimer = 0;
    this.fireParticles = [];
  }

  setPanBounds(min, max) {
    // Legacy - no longer used for dolly
  }

  catchFire() {
    if (!this.onFire) {
      this.onFire = true;
      this.onFireTimer = 0;
    }
  }

  isPlayerInFOV(playerX, playerY) {
    return pointInCone(
      playerX, playerY,
      this.getCenterX(), this.getCenterY(),
      Math.cos(this.facingAngle), Math.sin(this.facingAngle),
      this.fovRange, this.fovAngle / 2
    );
  }

  update(dt) {
    // Pan back and forth by rotating the facing angle
    this.facingAngle += this.panSpeed * this.panDirection * dt;
    if (this.facingAngle >= this.baseFacingAngle + this.panAngleRange) {
      this.facingAngle = this.baseFacingAngle + this.panAngleRange;
      this.panDirection = -1;
    } else if (this.facingAngle <= this.baseFacingAngle - this.panAngleRange) {
      this.facingAngle = this.baseFacingAngle - this.panAngleRange;
      this.panDirection = 1;
    }

    this.lensFlashTimer += dt;
    this.reelRotation += dt * 3;
    this.recordingPulse += dt;

    // Fire state
    if (this.onFire) {
      this.onFireTimer += dt;
      // Emit fire particles
      if (Math.random() < 0.5) {
        this.fireParticles.push({
          x: this.getCenterX() + (Math.random() - 0.5) * 30,
          y: this.y + Math.random() * 20,
          vy: -40 - Math.random() * 60,
          vx: (Math.random() - 0.5) * 20,
          life: 0.4 + Math.random() * 0.4,
          size: 3 + Math.random() * 5,
        });
      }
      for (let i = this.fireParticles.length - 1; i >= 0; i--) {
        const p = this.fireParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.fireParticles.splice(i, 1);
      }
    }
  }

  updatePlayerTracking(playerX, playerY, dt) {
    this.playerInFOV = this.isPlayerInFOV(playerX, playerY);

    if (!this.playerInFOV) {
      this.offCameraTimer += dt;
    } else {
      this.offCameraTimer = 0;
    }

    return this.offCameraTimer >= FOV_GRACE_PERIOD;
  }

  getOnCameraPercent(totalTime) {
    if (totalTime <= 0) return 1;
    return Math.max(0, 1 - (this.offCameraTimer / totalTime));
  }

  render(ctx, camera) {
    this._renderFOVCone(ctx, camera);

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    ctx.save();

    // Tripod legs
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 36); ctx.lineTo(sx + 3, sy + 48);
    ctx.moveTo(sx + 24, sy + 39); ctx.lineTo(sx + 24, sy + 48);
    ctx.moveTo(sx + 36, sy + 36); ctx.lineTo(sx + 45, sy + 48);
    ctx.stroke();

    ctx.fillStyle = '#505050';
    ctx.beginPath(); ctx.arc(sx + 12, sy + 36, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 36, sy + 36, 2, 0, Math.PI * 2); ctx.fill();

    // Tripod plate
    ctx.fillStyle = '#2a2a2a';
    this._roundRect(ctx, sx + 9, sy + 33, 30, 6, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(sx + 10, sy + 33, 28, 1);

    // Camera body
    const bodyGrad = ctx.createLinearGradient(sx + 3, sy + 9, sx + 45, sy + 36);
    bodyGrad.addColorStop(0, this.onFire ? '#2a1a0a' : '#1a1a1e');
    bodyGrad.addColorStop(0.5, this.onFire ? '#1c1208' : '#1c1c22');
    bodyGrad.addColorStop(1, this.onFire ? '#0e0a04' : '#0e0e12');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 3, sy + 9, 42, 27, 6);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(sx + 6, sy + 9, 36, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx + 6, sy + 34, 36, 2);

    // Lens
    const lensCx = sx + 24;
    const lensCy = sy + 21;
    ctx.fillStyle = '#0a0a0e';
    ctx.beginPath(); ctx.arc(lensCx, lensCy, 13.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333338';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lensCx, lensCy, 13.5, 0, Math.PI * 2); ctx.stroke();

    const lensGrad = ctx.createRadialGradient(lensCx - 3, lensCy - 3, 0, lensCx, lensCy, 10.5);
    lensGrad.addColorStop(0, '#4a6080');
    lensGrad.addColorStop(0.5, '#2a3a55');
    lensGrad.addColorStop(1, '#101828');
    ctx.fillStyle = lensGrad;
    ctx.beginPath(); ctx.arc(lensCx, lensCy, 10.5, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#3a4a60';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lensCx, lensCy, 6, 0, Math.PI * 2); ctx.stroke();

    if (Math.sin(this.lensFlashTimer * 2) > 0.8) {
      ctx.fillStyle = 'rgba(200,220,255,0.5)';
      ctx.beginPath(); ctx.arc(lensCx - 3, lensCy - 3, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    // Recording light
    const recPulse = Math.sin(this.recordingPulse * 4) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,0,0,${recPulse})`;
    ctx.beginPath(); ctx.arc(sx + 39, sy + 12, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,0,0,${recPulse * 0.3})`;
    ctx.beginPath(); ctx.arc(sx + 39, sy + 12, 9, 0, Math.PI * 2); ctx.fill();

    // Film reel
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath(); ctx.arc(sx + 9, sy + 6, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333338';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx + 9, sy + 6, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#444448';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const angle = this.reelRotation + (i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(sx + 9, sy + 6);
      ctx.lineTo(sx + 9 + Math.cos(angle) * 7.5, sy + 6 + Math.sin(angle) * 7.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#555558';
    ctx.beginPath(); ctx.arc(sx + 9, sy + 6, 3, 0, Math.PI * 2); ctx.fill();

    // Viewfinder
    ctx.fillStyle = '#141418';
    this._roundRect(ctx, sx + 42, sy + 15, 9, 12, 3);
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(sx + 44, sy + 18, 5, 6);

    // Fire effect on camera
    if (this.onFire) {
      for (const p of this.fireParticles) {
        const ps = camera.worldToScreen(p.x, p.y);
        const ratio = p.life / 0.8;
        ctx.fillStyle = `rgba(255,${Math.floor(100 + ratio * 100)},0,${ratio * 0.6})`;
        ctx.beginPath();
        ctx.arc(Math.floor(ps.x), Math.floor(ps.y), p.size * ratio, 0, Math.PI * 2);
        ctx.fill();
      }
      // Smoke
      ctx.fillStyle = 'rgba(60,60,60,0.2)';
      ctx.beginPath();
      ctx.arc(sx + 24, sy - 10 + Math.sin(this.onFireTimer * 3) * 5, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _renderFOVCone(ctx, camera) {
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const screen = camera.worldToScreen(cx, cy);

    const angle1 = this.facingAngle - this.fovAngle / 2;
    const angle2 = this.facingAngle + this.fovAngle / 2;
    const range = this.fovRange * camera.zoom;
    const steps = 24;

    ctx.save();

    if (this.playerInFOV) {
      const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, range);
      grad.addColorStop(0, 'rgba(255,240,180,0.15)');
      grad.addColorStop(0.3, 'rgba(255,230,150,0.12)');
      grad.addColorStop(0.6, 'rgba(255,220,120,0.08)');
      grad.addColorStop(1, 'rgba(255,200,80,0.03)');
      ctx.fillStyle = grad;
    } else {
      const flash = Math.sin(this.lensFlashTimer * 8) * 0.5 + 0.5;
      const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, range);
      grad.addColorStop(0, `rgba(255,80,80,${0.1 + flash * 0.1})`);
      grad.addColorStop(0.5, `rgba(255,50,50,${0.06 + flash * 0.06})`);
      grad.addColorStop(1, `rgba(255,30,30,${0.02})`);
      ctx.fillStyle = grad;
    }

    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    for (let i = 0; i <= steps; i++) {
      const a = angle1 + (angle2 - angle1) * (i / steps);
      ctx.lineTo(screen.x + Math.cos(a) * range, screen.y + Math.sin(a) * range);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.playerInFOV ? 'rgba(255,220,100,0.3)' : 'rgba(255,80,80,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + Math.cos(angle1) * range, screen.y + Math.sin(angle1) * range);
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + Math.cos(angle2) * range, screen.y + Math.sin(angle2) * range);
    ctx.stroke();

    // Dark overlay outside cone
    const vw = VIEWPORT_WIDTH;
    const vh = VIEWPORT_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(vw, 0); ctx.lineTo(vw, vh); ctx.lineTo(0, vh); ctx.closePath();
    ctx.moveTo(screen.x, screen.y);
    for (let i = steps; i >= 0; i--) {
      const a = angle1 + (angle2 - angle1) * (i / steps);
      ctx.lineTo(screen.x + Math.cos(a) * range, screen.y + Math.sin(a) * range);
    }
    ctx.closePath();
    ctx.fillStyle = this.playerInFOV ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.25)';
    ctx.fill();

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
