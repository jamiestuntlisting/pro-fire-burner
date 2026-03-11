import { Entity } from '../engine/Entity.js';
import { PLAYER_SPEED } from '../constants.js';

export class CameraCar extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 28;
    this.height = 20;
    this.speed = PLAYER_SPEED * 0.85;
    this.targetDistance = 120;
    this.maxDistance = 300;
    this.active = false;
    this.wheelRotation = 0;
  }

  activate() {
    this.active = true;
  }

  update(dt, playerY) {
    if (!this.active) return;

    this.wheelRotation += dt * 8;
    const distToPlayer = this.y - playerY;

    if (distToPlayer > this.targetDistance) {
      this.y -= this.speed * 1.3 * dt;
    } else if (distToPlayer < this.targetDistance * 0.5) {
      this.y -= this.speed * 0.7 * dt;
    } else {
      this.y -= this.speed * dt;
    }
  }

  hasReachedPlayer(playerY) {
    return this.active && Math.abs(this.y - playerY) < 16;
  }

  isPlayerTooFar(playerY) {
    return this.active && (this.y - playerY) > this.maxDistance;
  }

  render(ctx, camera) {
    if (!this.active) return;

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + 14, sy + 20, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body (dark production vehicle)
    const bodyGrad = ctx.createLinearGradient(sx + 2, sy + 2, sx + 26, sy + 18);
    bodyGrad.addColorStop(0, '#2a2a3a');
    bodyGrad.addColorStop(0.3, '#3a3a4a');
    bodyGrad.addColorStop(0.7, '#2a2a3a');
    bodyGrad.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 2, sy + 3, 24, 14, 3);

    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(sx + 3, sy + 3, 22, 1);

    // Windshield (angled, reflective)
    const windGrad = ctx.createLinearGradient(sx + 5, sy + 2, sx + 23, sy + 7);
    windGrad.addColorStop(0, '#5577aa');
    windGrad.addColorStop(0.3, '#6688bb');
    windGrad.addColorStop(0.7, '#4466aa');
    windGrad.addColorStop(1, '#335588');
    ctx.fillStyle = windGrad;
    this._roundRect(ctx, sx + 5, sy + 2, 18, 5, 2);
    // Reflection streak
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(sx + 8, sy + 2, 6, 1);

    // Headlights (warm glow)
    const hlGrad = ctx.createRadialGradient(sx + 5, sy + 1, 0, sx + 5, sy + 1, 4);
    hlGrad.addColorStop(0, 'rgba(255,255,200,0.5)');
    hlGrad.addColorStop(1, 'rgba(255,255,150,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(sx + 5, sy + 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffcc';
    this._roundRect(ctx, sx + 3, sy, 4, 2, 1);

    const hlGrad2 = ctx.createRadialGradient(sx + 23, sy + 1, 0, sx + 23, sy + 1, 4);
    hlGrad2.addColorStop(0, 'rgba(255,255,200,0.5)');
    hlGrad2.addColorStop(1, 'rgba(255,255,150,0)');
    ctx.fillStyle = hlGrad2;
    ctx.beginPath();
    ctx.arc(sx + 23, sy + 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffcc';
    this._roundRect(ctx, sx + 21, sy, 4, 2, 1);

    // Wheels with rotation
    for (const wx of [sx, sx + 25]) {
      for (const wy of [sy + 4, sy + 12]) {
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(wx + 1, wy + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        // Hub
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(wx + 1, wy + 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Spokes
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          const a = this.wheelRotation + (i * Math.PI * 2 / 3);
          ctx.beginPath();
          ctx.moveTo(wx + 1, wy + 2);
          ctx.lineTo(wx + 1 + Math.cos(a) * 2.5, wy + 2 + Math.sin(a) * 2.5);
          ctx.stroke();
        }
      }
    }

    // Camera mount on top (professional rig)
    ctx.fillStyle = '#1a1a1a';
    this._roundRect(ctx, sx + 9, sy - 3, 10, 5, 2);
    // Camera lens
    const camLensGrad = ctx.createRadialGradient(sx + 14, sy - 1, 0, sx + 14, sy - 1, 2.5);
    camLensGrad.addColorStop(0, '#5566aa');
    camLensGrad.addColorStop(1, '#334466');
    ctx.fillStyle = camLensGrad;
    ctx.beginPath();
    ctx.arc(sx + 14, sy - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Recording light
    const recPulse = Math.sin(this.wheelRotation * 2) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,0,0,${recPulse})`;
    ctx.beginPath();
    ctx.arc(sx + 17, sy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Light beams
    ctx.globalAlpha = 0.15;
    const beamGrad = ctx.createLinearGradient(sx + 5, sy, sx + 5, sy - 30);
    beamGrad.addColorStop(0, 'rgba(255,255,200,0.3)');
    beamGrad.addColorStop(1, 'rgba(255,255,150,0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy);
    ctx.lineTo(sx - 5, sy - 30);
    ctx.lineTo(sx + 13, sy - 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 21, sy);
    ctx.lineTo(sx + 13, sy - 30);
    ctx.lineTo(sx + 33, sy - 30);
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
