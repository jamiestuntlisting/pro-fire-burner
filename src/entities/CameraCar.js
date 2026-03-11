import { Entity } from '../engine/Entity.js';
import { PLAYER_SPEED } from '../constants.js';

export class CameraCar extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 84;
    this.height = 60;
    this.speed = PLAYER_SPEED * 0.85;
    this.targetDistance = 360;
    this.maxDistance = 900;
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
    return this.active && Math.abs(this.y - playerY) < 48;
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
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx + 42, sy + 60, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body (dark armored production vehicle - Metroid style)
    const bodyGrad = ctx.createLinearGradient(sx + 6, sy + 6, sx + 78, sy + 54);
    bodyGrad.addColorStop(0, '#1a1a28');
    bodyGrad.addColorStop(0.3, '#252535');
    bodyGrad.addColorStop(0.7, '#1a1a28');
    bodyGrad.addColorStop(1, '#0e0e1a');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 6, sy + 9, 72, 42, 9);

    // Armored plating lines
    ctx.strokeStyle = 'rgba(80,90,120,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 24);
    ctx.lineTo(sx + 72, sy + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 36);
    ctx.lineTo(sx + 72, sy + 36);
    ctx.stroke();

    // Body highlight (subtle)
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(sx + 9, sy + 9, 66, 3);

    // Windshield (angled, reflective - darker tint)
    const windGrad = ctx.createLinearGradient(sx + 15, sy + 6, sx + 69, sy + 21);
    windGrad.addColorStop(0, '#334466');
    windGrad.addColorStop(0.3, '#3d5577');
    windGrad.addColorStop(0.7, '#2a4466');
    windGrad.addColorStop(1, '#1e3350');
    ctx.fillStyle = windGrad;
    this._roundRect(ctx, sx + 15, sy + 6, 54, 15, 6);
    // Reflection streak
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(sx + 24, sy + 6, 18, 3);

    // Headlights (cooler, more ominous glow)
    const hlGrad = ctx.createRadialGradient(sx + 15, sy + 3, 0, sx + 15, sy + 3, 12);
    hlGrad.addColorStop(0, 'rgba(180,200,255,0.45)');
    hlGrad.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(sx + 15, sy + 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaccee';
    this._roundRect(ctx, sx + 9, sy, 12, 6, 3);

    const hlGrad2 = ctx.createRadialGradient(sx + 69, sy + 3, 0, sx + 69, sy + 3, 12);
    hlGrad2.addColorStop(0, 'rgba(180,200,255,0.45)');
    hlGrad2.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = hlGrad2;
    ctx.beginPath();
    ctx.arc(sx + 69, sy + 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaccee';
    this._roundRect(ctx, sx + 63, sy, 12, 6, 3);

    // Wheels with rotation
    for (const wx of [sx, sx + 75]) {
      for (const wy of [sy + 12, sy + 36]) {
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(wx + 3, wy + 6, 9, 0, Math.PI * 2);
        ctx.fill();
        // Hub
        ctx.fillStyle = '#333340';
        ctx.beginPath();
        ctx.arc(wx + 3, wy + 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Spokes
        ctx.strokeStyle = '#252530';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const a = this.wheelRotation + (i * Math.PI * 2 / 3);
          ctx.beginPath();
          ctx.moveTo(wx + 3, wy + 6);
          ctx.lineTo(wx + 3 + Math.cos(a) * 7.5, wy + 6 + Math.sin(a) * 7.5);
          ctx.stroke();
        }
      }
    }

    // Camera mount on top (heavy armored rig)
    ctx.fillStyle = '#0e0e14';
    this._roundRect(ctx, sx + 27, sy - 9, 30, 15, 6);
    // Armored edge on mount
    ctx.strokeStyle = 'rgba(60,70,100,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 30, sy - 9);
    ctx.lineTo(sx + 54, sy - 9);
    ctx.stroke();

    // Camera lens
    const camLensGrad = ctx.createRadialGradient(sx + 42, sy - 3, 0, sx + 42, sy - 3, 7.5);
    camLensGrad.addColorStop(0, '#3a4477');
    camLensGrad.addColorStop(1, '#1e2844');
    ctx.fillStyle = camLensGrad;
    ctx.beginPath();
    ctx.arc(sx + 42, sy - 3, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Recording light
    const recPulse = Math.sin(this.wheelRotation * 2) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,0,0,${recPulse})`;
    ctx.beginPath();
    ctx.arc(sx + 51, sy - 9, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Light beams (dimmer, more menacing)
    ctx.globalAlpha = 0.1;
    const beamGrad = ctx.createLinearGradient(sx + 15, sy, sx + 15, sy - 90);
    beamGrad.addColorStop(0, 'rgba(180,200,255,0.25)');
    beamGrad.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(sx + 9, sy);
    ctx.lineTo(sx - 15, sy - 90);
    ctx.lineTo(sx + 39, sy - 90);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 63, sy);
    ctx.lineTo(sx + 39, sy - 90);
    ctx.lineTo(sx + 99, sy - 90);
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
