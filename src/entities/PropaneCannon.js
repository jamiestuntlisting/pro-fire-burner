import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, PROPANE_DRAIN_AMOUNT } from '../constants.js';
import { distance } from '../utils/math.js';

export class PropaneCannon extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 16;
    this.height = 16;

    this.fireInterval = 3.5;
    this.timer = Math.random() * this.fireInterval;
    this.warningDuration = 0.8;
    this.burstDuration = 0.4;
    this.burstRadius = TILE_SIZE * 3;

    this.state = 'IDLE';
    this.firingTimer = 0;
    this.burstHit = false;
  }

  update(dt) {
    this.timer += dt;

    switch (this.state) {
      case 'IDLE':
        if (this.timer >= this.fireInterval) {
          this.state = 'WARNING';
          this.firingTimer = 0;
          this.timer = 0;
        }
        break;

      case 'WARNING':
        this.firingTimer += dt;
        if (this.firingTimer >= this.warningDuration) {
          this.state = 'FIRING';
          this.firingTimer = 0;
          this.burstHit = false;
        }
        break;

      case 'FIRING':
        this.firingTimer += dt;
        if (this.firingTimer >= this.burstDuration) {
          this.state = 'IDLE';
          this.timer = 0;
        }
        break;
    }
  }

  isPlayerInBurst(playerX, playerY) {
    if (this.state !== 'FIRING' || this.burstHit) return false;
    const dist = distance(this.getCenterX(), this.getCenterY(), playerX, playerY);
    if (dist <= this.burstRadius) {
      this.burstHit = true;
      return true;
    }
    return false;
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + 8, sy + 16, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base plate
    const baseGrad = ctx.createLinearGradient(sx + 1, sy + 12, sx + 15, sy + 16);
    baseGrad.addColorStop(0, '#555555');
    baseGrad.addColorStop(0.5, '#666666');
    baseGrad.addColorStop(1, '#444444');
    ctx.fillStyle = baseGrad;
    this._roundRect(ctx, sx + 1, sy + 12, 14, 4, 2);

    // Tank/body (metallic cylinder)
    const tankGrad = ctx.createLinearGradient(sx + 2, sy + 5, sx + 14, sy + 13);
    tankGrad.addColorStop(0, '#666666');
    tankGrad.addColorStop(0.2, '#888888');
    tankGrad.addColorStop(0.4, '#777777');
    tankGrad.addColorStop(0.6, '#888888');
    tankGrad.addColorStop(1, '#555555');
    ctx.fillStyle = tankGrad;
    this._roundRect(ctx, sx + 2, sy + 5, 12, 8, 3);

    // Tank highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(sx + 3, sy + 5, 2, 7);

    // Nozzle (top barrel)
    const nozzleGrad = ctx.createLinearGradient(sx + 4, sy + 0, sx + 12, sy + 6);
    nozzleGrad.addColorStop(0, '#444444');
    nozzleGrad.addColorStop(0.5, '#555555');
    nozzleGrad.addColorStop(1, '#333333');
    ctx.fillStyle = nozzleGrad;
    this._roundRect(ctx, sx + 4, sy + 1, 8, 5, 2);

    // Nozzle opening
    ctx.fillStyle = '#222222';
    this._roundRect(ctx, sx + 5, sy - 1, 6, 3, 1);
    ctx.fillStyle = this.state === 'IDLE' ? '#1a1a1a' : '#331100';
    ctx.fillRect(sx + 6, sy - 1, 4, 2);

    // Warning indicator
    if (this.state === 'WARNING') {
      const flash = Math.sin(this.firingTimer * 20) > 0;
      if (flash) {
        ctx.globalAlpha = 0.25;
        const radius = this.burstRadius * camera.zoom;
        const sc = camera.worldToScreen(this.getCenterX(), this.getCenterY());
        const warnGrad = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, radius);
        warnGrad.addColorStop(0, 'rgba(255,0,0,0.3)');
        warnGrad.addColorStop(0.5, 'rgba(255,0,0,0.15)');
        warnGrad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = warnGrad;
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Firing burst
    if (this.state === 'FIRING') {
      const burstProgress = this.firingTimer / this.burstDuration;
      const radius = this.burstRadius * camera.zoom;
      const sc = camera.worldToScreen(this.getCenterX(), this.getCenterY());

      // Outer explosion
      ctx.globalAlpha = 0.4 * (1 - burstProgress);
      const burstGrad = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, radius);
      burstGrad.addColorStop(0, 'rgba(255,200,50,0.6)');
      burstGrad.addColorStop(0.3, 'rgba(255,130,0,0.4)');
      burstGrad.addColorStop(0.6, 'rgba(255,80,0,0.2)');
      burstGrad.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = burstGrad;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner core
      ctx.globalAlpha = 0.6 * (1 - burstProgress);
      const coreGrad = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, radius * 0.4);
      coreGrad.addColorStop(0, 'rgba(255,255,200,0.9)');
      coreGrad.addColorStop(0.5, 'rgba(255,220,80,0.5)');
      coreGrad.addColorStop(1, 'rgba(255,150,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Flame jet from nozzle
      const jetGrad = ctx.createLinearGradient(sx + 8, sy - 2, sx + 8, sy - 18);
      jetGrad.addColorStop(0, 'rgba(255,200,50,0.9)');
      jetGrad.addColorStop(0.3, 'rgba(255,130,0,0.7)');
      jetGrad.addColorStop(0.7, 'rgba(255,80,0,0.3)');
      jetGrad.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(sx + 5, sy - 1);
      ctx.lineTo(sx + 11, sy - 1);
      ctx.lineTo(sx + 13, sy - 14);
      ctx.lineTo(sx + 3, sy - 14);
      ctx.closePath();
      ctx.fill();
    }

    // Indicator light
    const lightColor = this.state === 'IDLE' ? '#00cc00' : '#ff0000';
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(sx + 13, sy + 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Light glow
    ctx.fillStyle = this.state === 'IDLE' ? 'rgba(0,200,0,0.2)' : 'rgba(255,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(sx + 13, sy + 7, 3, 0, Math.PI * 2);
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
