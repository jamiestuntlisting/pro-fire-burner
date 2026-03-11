import { Entity } from '../engine/Entity.js';

export const PICKUP_TYPE = {
  GEL: 'GEL',
  FUEL: 'FUEL',
};

export class Pickup extends Entity {
  constructor(x, y, type) {
    super(x, y);
    this.type = type;
    this.width = 64;
    this.height = 64;
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
    const sy = Math.floor(screen.y) + Math.sin(this.bobTimer) * 4.5;

    const pulse = Math.sin(this.pulseTimer) * 0.3 + 0.7;
    const cx = sx + 18;
    const cy = sy + 18;

    ctx.save();

    // Large outer beacon glow
    const beaconPulse = Math.sin(this.pulseTimer * 1.5) * 0.3 + 0.5;
    if (this.type === PICKUP_TYPE.GEL) {
      ctx.fillStyle = `rgba(40,120,255,${beaconPulse * 0.15})`;
    } else {
      ctx.fillStyle = `rgba(255,120,20,${beaconPulse * 0.15})`;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();

    // Expanding beacon ring
    const ringRadius = 30 + Math.sin(this.pulseTimer * 2) * 8;
    const ringAlpha = (1 - (ringRadius - 30) / 8) * 0.4;
    ctx.lineWidth = 2;
    if (this.type === PICKUP_TYPE.GEL) {
      ctx.strokeStyle = `rgba(80,160,255,${Math.max(0, ringAlpha)})`;
    } else {
      ctx.strokeStyle = `rgba(255,160,40,${Math.max(0, ringAlpha)})`;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

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
    // Outer glow effect - blue energy field
    ctx.fillStyle = 'rgba(20,60,180,0.12)';
    ctx.beginPath();
    ctx.arc(sx + 18, sy + 18, 24, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow ring
    ctx.fillStyle = 'rgba(40,100,255,0.18)';
    ctx.beginPath();
    ctx.arc(sx + 18, sy + 18, 18, 0, Math.PI * 2);
    ctx.fill();

    // Canister body - dark industrial shell
    const shellGrad = ctx.createLinearGradient(sx + 6, sy + 9, sx + 30, sy + 33);
    shellGrad.addColorStop(0, '#1a2a3a');
    shellGrad.addColorStop(0.3, '#253545');
    shellGrad.addColorStop(0.7, '#152535');
    shellGrad.addColorStop(1, '#0a1520');
    ctx.fillStyle = shellGrad;
    this._roundRect(ctx, sx + 6, sy + 9, 24, 24, 6);

    // Inner containment window - glowing blue energy
    const energyGrad = ctx.createLinearGradient(sx + 9, sy + 12, sx + 27, sy + 30);
    energyGrad.addColorStop(0, '#2266dd');
    energyGrad.addColorStop(0.3, '#3399ff');
    energyGrad.addColorStop(0.6, '#1155cc');
    energyGrad.addColorStop(1, '#0a3388');
    ctx.fillStyle = energyGrad;
    this._roundRect(ctx, sx + 9, sy + 12, 18, 18, 3);

    // Gel energy level inside (sloshing)
    const gelLevel = 0.6 + Math.sin(this.pulseTimer * 1.5) * 0.1;
    ctx.fillStyle = 'rgba(80,180,255,0.5)';
    const gelTop = sy + 12 + (1 - gelLevel) * 18;
    ctx.fillRect(sx + 10, gelTop, 16, sy + 30 - gelTop);

    // Top collar / seal ring
    ctx.fillStyle = '#2a3a4a';
    this._roundRect(ctx, sx + 9, sy + 6, 18, 6, 3);

    // Pressure valve on top
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(sx + 15, sy + 0, 6, 6);
    ctx.fillStyle = '#4a5a6a';
    ctx.fillRect(sx + 15, sy + 0, 6, 3);

    // Side metal ridges
    ctx.fillStyle = 'rgba(100,140,180,0.2)';
    ctx.fillRect(sx + 6, sy + 15, 24, 2);
    ctx.fillRect(sx + 6, sy + 27, 24, 2);

    // Label stripe indicator
    ctx.fillStyle = 'rgba(100,200,255,0.6)';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 9, sy + 18, 18, 3);
    ctx.globalAlpha = 1;

    // Metallic shine highlight
    ctx.fillStyle = 'rgba(150,200,255,0.25)';
    ctx.fillRect(sx + 9, sy + 12, 6, 9);

    // Energy sparkle
    const sparkle = Math.sin(this.pulseTimer * 5) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(140,200,255,${sparkle * 0.9})`;
    ctx.beginPath();
    ctx.arc(sx + 24, sy + 12, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary sparkle
    ctx.fillStyle = `rgba(180,220,255,${(1 - sparkle) * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx + 12, sy + 24, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderFuelCan(ctx, sx, sy) {
    // Outer glow effect - orange energy field
    ctx.fillStyle = 'rgba(180,60,0,0.10)';
    ctx.beginPath();
    ctx.arc(sx + 18, sy + 18, 24, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow ring
    ctx.fillStyle = 'rgba(255,80,0,0.15)';
    ctx.beginPath();
    ctx.arc(sx + 18, sy + 18, 18, 0, Math.PI * 2);
    ctx.fill();

    // Power cell body - dark armored shell
    const cellGrad = ctx.createLinearGradient(sx + 3, sy + 9, sx + 33, sy + 33);
    cellGrad.addColorStop(0, '#2a1a0a');
    cellGrad.addColorStop(0.3, '#3a2515');
    cellGrad.addColorStop(0.7, '#2a1a0a');
    cellGrad.addColorStop(1, '#1a0f05');
    ctx.fillStyle = cellGrad;
    this._roundRect(ctx, sx + 3, sy + 9, 30, 24, 6);

    // Inner energy core - orange power glow
    const coreGrad = ctx.createLinearGradient(sx + 6, sy + 12, sx + 30, sy + 30);
    coreGrad.addColorStop(0, '#cc4400');
    coreGrad.addColorStop(0.3, '#ff6622');
    coreGrad.addColorStop(0.7, '#bb3300');
    coreGrad.addColorStop(1, '#882200');
    ctx.fillStyle = coreGrad;
    this._roundRect(ctx, sx + 6, sy + 12, 24, 18, 3);

    // Top handle / connector arch
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(sx + 9, sy + 9);
    ctx.quadraticCurveTo(sx + 18, sy + 0, sx + 27, sy + 9);
    ctx.stroke();

    // Power conduit / nozzle
    ctx.fillStyle = '#333333';
    ctx.fillRect(sx + 27, sy + 3, 6, 12);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(sx + 27, sy + 3, 6, 3);

    // Hazard energy symbol on cell
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(sx + 18, sy + 15);
    ctx.lineTo(sx + 24, sy + 24);
    ctx.lineTo(sx + 18, sy + 21);
    ctx.lineTo(sx + 12, sy + 24);
    ctx.closePath();
    ctx.fill();

    // Side armor ridges
    ctx.fillStyle = 'rgba(255,180,100,0.15)';
    ctx.fillRect(sx + 3, sy + 15, 30, 2);
    ctx.fillRect(sx + 3, sy + 27, 30, 2);

    // Metallic ridge line
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(sx + 6, sy + 18, 24, 3);

    // Shine highlight
    ctx.fillStyle = 'rgba(255,200,150,0.25)';
    ctx.fillRect(sx + 6, sy + 12, 6, 9);

    // Energy drip from conduit
    const drip = Math.sin(this.pulseTimer * 4) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,120,0,${drip * 0.7})`;
    ctx.beginPath();
    ctx.arc(sx + 30, sy + 15 + drip * 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Secondary pulse glow
    ctx.fillStyle = `rgba(255,150,50,${(1 - drip) * 0.5})`;
    ctx.beginPath();
    ctx.arc(sx + 12, sy + 24, 3, 0, Math.PI * 2);
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
