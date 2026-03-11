import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, TORCH_EFFECT_RADIUS, TORCH_DRAIN_MULTIPLIER } from '../constants.js';
import { distance } from '../utils/math.js';

export class Torch extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 8;
    this.height = 16;
    this.effectRadius = TORCH_EFFECT_RADIUS * TILE_SIZE;
    this.drainMultiplier = TORCH_DRAIN_MULTIPLIER;
    this.flameTimer = 0;
    this.flameFrame = 0;
    this.flickerTimer = 0;
  }

  isPlayerNearby(playerX, playerY) {
    const dist = distance(this.getCenterX(), this.getCenterY(), playerX, playerY);
    return dist <= this.effectRadius;
  }

  update(dt) {
    this.flameTimer += dt;
    this.flickerTimer += dt;
    if (this.flameTimer > 0.1) {
      this.flameTimer -= 0.1;
      this.flameFrame = (this.flameFrame + 1) % 4;
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    ctx.save();

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx + 4, sy + 16, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pole (wood grain effect)
    const poleGrad = ctx.createLinearGradient(sx + 2, sy + 6, sx + 6, sy + 16);
    poleGrad.addColorStop(0, '#887766');
    poleGrad.addColorStop(0.3, '#776655');
    poleGrad.addColorStop(0.5, '#665544');
    poleGrad.addColorStop(0.7, '#776655');
    poleGrad.addColorStop(1, '#554433');
    ctx.fillStyle = poleGrad;
    this._roundRect(ctx, sx + 2, sy + 6, 4, 10, 1);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy + 7);
    ctx.lineTo(sx + 3, sy + 15);
    ctx.moveTo(sx + 5, sy + 8);
    ctx.lineTo(sx + 5, sy + 14);
    ctx.stroke();

    // Base (stone/metal)
    const baseGrad = ctx.createLinearGradient(sx, sy + 14, sx + 8, sy + 16);
    baseGrad.addColorStop(0, '#666666');
    baseGrad.addColorStop(0.5, '#888888');
    baseGrad.addColorStop(1, '#555555');
    ctx.fillStyle = baseGrad;
    this._roundRect(ctx, sx, sy + 14, 8, 2, 1);

    // Bowl/brazier
    const bowlGrad = ctx.createLinearGradient(sx - 1, sy + 4, sx + 9, sy + 7);
    bowlGrad.addColorStop(0, '#998877');
    bowlGrad.addColorStop(0.3, '#aa9988');
    bowlGrad.addColorStop(0.7, '#887766');
    bowlGrad.addColorStop(1, '#776655');
    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.moveTo(sx - 1, sy + 4);
    ctx.lineTo(sx + 9, sy + 4);
    ctx.lineTo(sx + 8, sy + 7);
    ctx.lineTo(sx, sy + 7);
    ctx.closePath();
    ctx.fill();

    // Flame glow (ambient)
    const flicker = Math.sin(this.flickerTimer * 12) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,150,30,${0.15 * flicker})`;
    ctx.beginPath();
    ctx.arc(sx + 4, sy + 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Main flame body
    const flameH = 5 + Math.sin(this.flickerTimer * 8) * 1;
    const flameGrad = ctx.createRadialGradient(sx + 4, sy + 2, 0, sx + 4, sy + 1, flameH);
    flameGrad.addColorStop(0, 'rgba(255,255,220,0.95)');
    flameGrad.addColorStop(0.2, 'rgba(255,220,80,0.9)');
    flameGrad.addColorStop(0.5, 'rgba(255,150,20,0.7)');
    flameGrad.addColorStop(0.8, 'rgba(255,80,0,0.4)');
    flameGrad.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = flameGrad;

    // Organic flame shape
    ctx.beginPath();
    const wobble1 = Math.sin(this.flickerTimer * 10) * 0.8;
    const wobble2 = Math.cos(this.flickerTimer * 7) * 0.6;
    ctx.moveTo(sx + 1, sy + 5);
    ctx.quadraticCurveTo(sx + 1 + wobble1, sy + 1, sx + 4, sy - flameH + 3);
    ctx.quadraticCurveTo(sx + 7 + wobble2, sy + 1, sx + 7, sy + 5);
    ctx.closePath();
    ctx.fill();

    // Inner white-hot core
    ctx.fillStyle = 'rgba(255,255,200,0.6)';
    ctx.beginPath();
    ctx.ellipse(sx + 4, sy + 3, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Danger zone glow
    const radius = this.effectRadius * camera.zoom;
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const sc = camera.worldToScreen(cx, cy);
    const dangerGrad = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, radius);
    dangerGrad.addColorStop(0, 'rgba(255,100,0,0.06)');
    dangerGrad.addColorStop(0.5, 'rgba(255,80,0,0.03)');
    dangerGrad.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = dangerGrad;
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
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
