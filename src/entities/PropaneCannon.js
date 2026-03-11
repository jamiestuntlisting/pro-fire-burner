import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, PROPANE_DRAIN_AMOUNT } from '../constants.js';
import { distance } from '../utils/math.js';

export class PropaneCannon extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 48;
    this.height = 48;

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
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + 24, sy + 48, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy base plate - industrial bolted steel
    const baseGrad = ctx.createLinearGradient(sx + 3, sy + 36, sx + 45, sy + 48);
    baseGrad.addColorStop(0, '#2a2a2a');
    baseGrad.addColorStop(0.3, '#383838');
    baseGrad.addColorStop(0.5, '#333333');
    baseGrad.addColorStop(0.7, '#383838');
    baseGrad.addColorStop(1, '#222222');
    ctx.fillStyle = baseGrad;
    this._roundRect(ctx, sx + 3, sy + 36, 42, 12, 3);

    // Base plate edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(sx + 4, sy + 36, 40, 2);

    // Base bolts - 4 corners
    ctx.fillStyle = '#4a4a4a';
    [[8, 39], [40, 39], [8, 45], [40, 45]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(sx + bx, sy + by, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#1e1e1e';
    [[8, 39], [40, 39], [8, 45], [40, 45]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(sx + bx, sy + by, 1, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hydraulic support legs
    const legGrad = ctx.createLinearGradient(sx + 6, sy + 30, sx + 14, sy + 38);
    legGrad.addColorStop(0, '#3d3d3d');
    legGrad.addColorStop(0.5, '#4a4a4a');
    legGrad.addColorStop(1, '#2e2e2e');
    ctx.fillStyle = legGrad;
    this._roundRect(ctx, sx + 8, sy + 30, 6, 8, 1);
    this._roundRect(ctx, sx + 34, sy + 30, 6, 8, 1);

    // Main tank/body - heavy armored cylinder
    const tankGrad = ctx.createLinearGradient(sx + 6, sy + 15, sx + 42, sy + 39);
    tankGrad.addColorStop(0, '#333333');
    tankGrad.addColorStop(0.1, '#444444');
    tankGrad.addColorStop(0.25, '#3a3a3a');
    tankGrad.addColorStop(0.4, '#474747');
    tankGrad.addColorStop(0.6, '#3a3a3a');
    tankGrad.addColorStop(0.8, '#444444');
    tankGrad.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = tankGrad;
    this._roundRect(ctx, sx + 6, sy + 15, 36, 24, 9);

    // Tank specular highlight strip
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(sx + 9, sy + 15, 6, 21);

    // Tank dark edge
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(sx + 36, sy + 17, 4, 18);

    // Hazard stripe band around tank
    ctx.fillStyle = '#2a2200';
    this._roundRect(ctx, sx + 6, sy + 24, 36, 5, 0);
    // Diagonal hazard lines
    ctx.strokeStyle = '#443300';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + 8 + i * 5, sy + 24);
      ctx.lineTo(sx + 12 + i * 5, sy + 29);
      ctx.stroke();
    }

    // Reinforcement ring - upper
    const ringGrad = ctx.createLinearGradient(sx + 4, sy + 16, sx + 44, sy + 20);
    ringGrad.addColorStop(0, '#2e2e2e');
    ringGrad.addColorStop(0.3, '#424242');
    ringGrad.addColorStop(0.7, '#3a3a3a');
    ringGrad.addColorStop(1, '#262626');
    ctx.fillStyle = ringGrad;
    this._roundRect(ctx, sx + 4, sy + 16, 40, 4, 2);

    // Reinforcement ring - lower
    ctx.fillStyle = ringGrad;
    this._roundRect(ctx, sx + 4, sy + 32, 40, 4, 2);

    // Nozzle assembly - barrel
    const nozzleGrad = ctx.createLinearGradient(sx + 12, sy + 0, sx + 36, sy + 18);
    nozzleGrad.addColorStop(0, '#2e2e2e');
    nozzleGrad.addColorStop(0.3, '#3d3d3d');
    nozzleGrad.addColorStop(0.6, '#353535');
    nozzleGrad.addColorStop(1, '#1e1e1e');
    ctx.fillStyle = nozzleGrad;
    this._roundRect(ctx, sx + 12, sy + 3, 24, 15, 6);

    // Barrel cooling fins
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const finY = sy + 5 + i * 3;
      ctx.beginPath();
      ctx.moveTo(sx + 14, finY);
      ctx.lineTo(sx + 34, finY);
      ctx.stroke();
    }

    // Nozzle opening - recessed dark bore
    const boreGrad = ctx.createLinearGradient(sx + 15, sy - 3, sx + 33, sy + 6);
    boreGrad.addColorStop(0, '#1a1a1a');
    boreGrad.addColorStop(0.5, '#222222');
    boreGrad.addColorStop(1, '#151515');
    ctx.fillStyle = boreGrad;
    this._roundRect(ctx, sx + 15, sy - 3, 18, 9, 3);

    // Inner bore - heat-stained
    ctx.fillStyle = this.state === 'IDLE' ? '#0e0e0e' : '#2a1000';
    ctx.fillRect(sx + 18, sy - 3, 12, 6);

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
      const jetGrad = ctx.createLinearGradient(sx + 24, sy - 6, sx + 24, sy - 54);
      jetGrad.addColorStop(0, 'rgba(255,200,50,0.9)');
      jetGrad.addColorStop(0.3, 'rgba(255,130,0,0.7)');
      jetGrad.addColorStop(0.7, 'rgba(255,80,0,0.3)');
      jetGrad.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(sx + 15, sy - 3);
      ctx.lineTo(sx + 33, sy - 3);
      ctx.lineTo(sx + 39, sy - 42);
      ctx.lineTo(sx + 9, sy - 42);
      ctx.closePath();
      ctx.fill();
    }

    // Indicator light - larger, more visible
    const lightColor = this.state === 'IDLE' ? '#00aa00' : '#ff0000';
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(sx + 39, sy + 21, 3, 0, Math.PI * 2);
    ctx.fill();
    // Light glow
    ctx.fillStyle = this.state === 'IDLE' ? 'rgba(0,170,0,0.2)' : 'rgba(255,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(sx + 39, sy + 21, 7, 0, Math.PI * 2);
    ctx.fill();
    // Light housing ring
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx + 39, sy + 21, 4, 0, Math.PI * 2);
    ctx.stroke();

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
