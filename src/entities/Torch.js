import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, TORCH_EFFECT_RADIUS, TORCH_DRAIN_MULTIPLIER } from '../constants.js';
import { distance } from '../utils/math.js';

export class Torch extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 24;
    this.height = 48;
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
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + 12, sy + 48, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Industrial mounting base - heavy bolted plate
    const basePlateGrad = ctx.createLinearGradient(sx - 3, sy + 42, sx + 27, sy + 48);
    basePlateGrad.addColorStop(0, '#2a2a2a');
    basePlateGrad.addColorStop(0.3, '#3a3a3a');
    basePlateGrad.addColorStop(0.7, '#333333');
    basePlateGrad.addColorStop(1, '#1e1e1e');
    ctx.fillStyle = basePlateGrad;
    this._roundRect(ctx, sx - 3, sy + 42, 30, 6, 2);

    // Base plate bolts
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.arc(sx + 1, sy + 45, 1.5, 0, Math.PI * 2);
    ctx.arc(sx + 23, sy + 45, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(sx + 1, sy + 45, 0.8, 0, Math.PI * 2);
    ctx.arc(sx + 23, sy + 45, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Main pipe/column - dark gunmetal
    const pipeGrad = ctx.createLinearGradient(sx + 6, sy + 18, sx + 18, sy + 42);
    pipeGrad.addColorStop(0, '#3d3d3d');
    pipeGrad.addColorStop(0.15, '#4a4a4a');
    pipeGrad.addColorStop(0.3, '#383838');
    pipeGrad.addColorStop(0.5, '#444444');
    pipeGrad.addColorStop(0.7, '#353535');
    pipeGrad.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = pipeGrad;
    this._roundRect(ctx, sx + 6, sy + 18, 12, 24, 3);

    // Pipe specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(sx + 7, sy + 19, 3, 22);

    // Pipe rivet band - upper
    const rivetGrad = ctx.createLinearGradient(sx + 4, sy + 22, sx + 20, sy + 26);
    rivetGrad.addColorStop(0, '#2e2e2e');
    rivetGrad.addColorStop(0.5, '#404040');
    rivetGrad.addColorStop(1, '#252525');
    ctx.fillStyle = rivetGrad;
    this._roundRect(ctx, sx + 4, sy + 22, 16, 4, 1);

    // Pipe rivet band - lower
    ctx.fillStyle = rivetGrad;
    this._roundRect(ctx, sx + 4, sy + 36, 16, 4, 1);

    // Rivets on bands
    ctx.fillStyle = '#555555';
    [24, 38].forEach(bandY => {
      ctx.beginPath();
      ctx.arc(sx + 6, sy + bandY, 1, 0, Math.PI * 2);
      ctx.arc(sx + 18, sy + bandY, 1, 0, Math.PI * 2);
      ctx.fill();
    });

    // Vent housing / heat emitter head
    const ventGrad = ctx.createLinearGradient(sx - 3, sy + 12, sx + 27, sy + 21);
    ventGrad.addColorStop(0, '#3a2a20');
    ventGrad.addColorStop(0.2, '#4a3a30');
    ventGrad.addColorStop(0.5, '#3d2d22');
    ventGrad.addColorStop(0.8, '#4a3a30');
    ventGrad.addColorStop(1, '#2e1e14');
    ctx.fillStyle = ventGrad;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + 12);
    ctx.lineTo(sx + 27, sy + 12);
    ctx.lineTo(sx + 24, sy + 21);
    ctx.lineTo(sx, sy + 21);
    ctx.closePath();
    ctx.fill();

    // Vent slats (dark horizontal lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const slotY = sy + 14 + i * 2.5;
      ctx.beginPath();
      ctx.moveTo(sx + 1, slotY);
      ctx.lineTo(sx + 23, slotY);
      ctx.stroke();
    }

    // Heat glow from vent interior
    const ventGlow = ctx.createLinearGradient(sx + 3, sy + 13, sx + 21, sy + 20);
    ventGlow.addColorStop(0, 'rgba(180,60,10,0.15)');
    ventGlow.addColorStop(0.5, 'rgba(220,80,10,0.2)');
    ventGlow.addColorStop(1, 'rgba(180,60,10,0.1)');
    ctx.fillStyle = ventGlow;
    ctx.fillRect(sx + 1, sy + 13, 22, 7);

    // Flame glow (ambient)
    const flicker = Math.sin(this.flickerTimer * 12) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(200,80,10,${0.12 * flicker})`;
    ctx.beginPath();
    ctx.arc(sx + 12, sy + 6, 24, 0, Math.PI * 2);
    ctx.fill();

    // Main flame body - more orange/industrial
    const flameH = 15 + Math.sin(this.flickerTimer * 8) * 3;
    const flameGrad = ctx.createRadialGradient(sx + 12, sy + 6, 0, sx + 12, sy + 3, flameH);
    flameGrad.addColorStop(0, 'rgba(255,230,180,0.9)');
    flameGrad.addColorStop(0.2, 'rgba(255,160,40,0.85)');
    flameGrad.addColorStop(0.5, 'rgba(220,100,10,0.6)');
    flameGrad.addColorStop(0.8, 'rgba(180,50,0,0.3)');
    flameGrad.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = flameGrad;

    // Organic flame shape
    ctx.beginPath();
    const wobble1 = Math.sin(this.flickerTimer * 10) * 2.4;
    const wobble2 = Math.cos(this.flickerTimer * 7) * 1.8;
    ctx.moveTo(sx + 3, sy + 15);
    ctx.quadraticCurveTo(sx + 3 + wobble1, sy + 3, sx + 12, sy - flameH + 9);
    ctx.quadraticCurveTo(sx + 21 + wobble2, sy + 3, sx + 21, sy + 15);
    ctx.closePath();
    ctx.fill();

    // Inner white-hot core
    ctx.fillStyle = 'rgba(255,220,160,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx + 12, sy + 9, 4.5, 6, 0, 0, Math.PI * 2);
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
