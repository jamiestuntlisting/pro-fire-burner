import { Entity } from '../engine/Entity.js';

export const PICKUP_TYPE = {
  GEL: 'GEL',
  FUEL: 'FUEL',
};

export class Pickup extends Entity {
  constructor(x, y, type) {
    super(x, y);
    this.type = type;
    this.width = 12;
    this.height = 12;
    this.pulseTimer = Math.random() * Math.PI * 2;
    this.collected = false;
    this.bobTimer = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.pulseTimer += dt * 3;
    this.bobTimer += dt * 2;
  }

  collect() {
    this.collected = true;
    this.dead = true;
  }

  render(ctx, camera) {
    if (this.dead) return;
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y) + Math.sin(this.bobTimer) * 1.5;

    const pulse = Math.sin(this.pulseTimer) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = pulse;

    if (this.type === PICKUP_TYPE.GEL) {
      this._renderGelBottle(ctx, sx, sy);
    } else {
      this._renderFuelCan(ctx, sx, sy);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderGelBottle(ctx, sx, sy) {
    // Glow effect
    ctx.fillStyle = 'rgba(50,120,255,0.15)';
    ctx.beginPath();
    ctx.arc(sx + 6, sy + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    // Bottle body - blue translucent gel tube
    const bodyGrad = ctx.createLinearGradient(sx + 2, sy + 3, sx + 10, sy + 11);
    bodyGrad.addColorStop(0, '#3388ff');
    bodyGrad.addColorStop(0.4, '#55aaff');
    bodyGrad.addColorStop(0.6, '#2266dd');
    bodyGrad.addColorStop(1, '#1144aa');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 2, sy + 3, 8, 8, 2);

    // Gel level inside (sloshing)
    const gelLevel = 0.6 + Math.sin(this.pulseTimer * 1.5) * 0.1;
    ctx.fillStyle = 'rgba(100,200,255,0.5)';
    const gelTop = sy + 3 + (1 - gelLevel) * 8;
    ctx.fillRect(sx + 3, gelTop, 6, sy + 11 - gelTop);

    // Cap/nozzle
    ctx.fillStyle = '#88ccff';
    this._roundRect(ctx, sx + 4, sy + 1, 4, 3, 1);

    // Pump top
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(sx + 5, sy, 2, 2);

    // Label "GEL" indicator
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 3, sy + 6, 6, 1);
    ctx.globalAlpha = 1;

    // Shine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(sx + 3, sy + 4, 2, 3);

    // Sparkle
    const sparkle = Math.sin(this.pulseTimer * 5) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(180,220,255,${sparkle * 0.8})`;
    ctx.beginPath();
    ctx.arc(sx + 8, sy + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderFuelCan(ctx, sx, sy) {
    // Glow effect
    ctx.fillStyle = 'rgba(255,100,0,0.12)';
    ctx.beginPath();
    ctx.arc(sx + 6, sy + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    // Gas can body
    const canGrad = ctx.createLinearGradient(sx + 1, sy + 3, sx + 11, sy + 11);
    canGrad.addColorStop(0, '#dd5500');
    canGrad.addColorStop(0.3, '#ff7722');
    canGrad.addColorStop(0.7, '#cc4400');
    canGrad.addColorStop(1, '#993300');
    ctx.fillStyle = canGrad;
    this._roundRect(ctx, sx + 1, sy + 3, 10, 8, 2);

    // Handle on top
    ctx.strokeStyle = '#884400';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy + 3);
    ctx.quadraticCurveTo(sx + 6, sy, sx + 9, sy + 3);
    ctx.stroke();

    // Spout/nozzle
    ctx.fillStyle = '#666666';
    ctx.fillRect(sx + 9, sy + 1, 2, 4);
    ctx.fillStyle = '#888888';
    ctx.fillRect(sx + 9, sy + 1, 2, 1);

    // Flame logo on can
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(sx + 6, sy + 5);
    ctx.lineTo(sx + 8, sy + 8);
    ctx.lineTo(sx + 6, sy + 7);
    ctx.lineTo(sx + 4, sy + 8);
    ctx.closePath();
    ctx.fill();

    // Metallic ridge line
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(sx + 2, sy + 6, 8, 1);

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(sx + 2, sy + 4, 2, 3);

    // Drip from nozzle
    const drip = Math.sin(this.pulseTimer * 4) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,150,0,${drip * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx + 10, sy + 5 + drip * 2, 1, 0, Math.PI * 2);
    ctx.fill();
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
