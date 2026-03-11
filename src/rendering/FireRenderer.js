import { randomRange } from '../utils/math.js';

export class FireRenderer {
  constructor() {
    this.flameTimer = 0;
    this.tongues = [];
    this.sparks = [];
    this.intensity = 0;
    this.playerX = 0;
    this.playerY = 0;
  }

  update(dt, playerX, playerY, intensity) {
    this.flameTimer += dt;
    this.intensity = intensity;
    this.playerX = playerX;
    this.playerY = playerY;

    if (intensity <= 0) {
      this.tongues = [];
      this.sparks = [];
      return;
    }

    // Update existing sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 40 * dt;
      s.life -= dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }

    // Emit sparks
    if (Math.random() < intensity * 0.8) {
      this.sparks.push({
        x: playerX + 14 + randomRange(-8, 8),
        y: playerY - 20 + randomRange(-10, 5),
        vx: randomRange(-30, 30),
        vy: randomRange(-80, -30),
        life: randomRange(0.3, 0.8),
        maxLife: 0.8,
        size: randomRange(1.5, 3.5),
      });
    }
  }

  render(ctx, camera) {
    if (this.intensity <= 0) return;
    ctx.save();

    const headX = this.playerX + 14;
    const headY = this.playerY - 4;
    const screen = camera.worldToScreen(headX, headY);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);
    const t = this.flameTimer;
    const intensity = this.intensity;

    // Base fire size
    const baseW = 18 + intensity * 12;
    const baseH = 30 + intensity * 40;

    // === OUTER GLOW ===
    const glowG = ctx.createRadialGradient(sx, sy - baseH * 0.3, 0, sx, sy, baseH * 0.9);
    glowG.addColorStop(0, `rgba(255,100,0,${0.12 * intensity})`);
    glowG.addColorStop(0.5, `rgba(255,60,0,${0.06 * intensity})`);
    glowG.addColorStop(1, 'rgba(255,30,0,0)');
    ctx.fillStyle = glowG;
    ctx.beginPath();
    ctx.ellipse(sx, sy - baseH * 0.2, baseW * 1.8, baseH * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // === MAIN FLAME BODY - deep red/brown base ===
    this._drawFlameBody(ctx, sx, sy, baseW, baseH, t, intensity);

    // === FLAME TONGUES - multiple animated tongues like reference ===
    const numTongues = 5 + Math.floor(intensity * 4);
    for (let i = 0; i < numTongues; i++) {
      const phase = (i / numTongues) * Math.PI * 2;
      const tongueX = sx + Math.sin(t * 3 + phase) * baseW * 0.5;
      const swaySpeed = 2 + (i % 3) * 1.5;
      const sway = Math.sin(t * swaySpeed + phase * 2) * baseW * 0.3;
      const tongueH = baseH * (0.5 + (i % 3) * 0.25) * intensity;
      const tongueW = baseW * (0.15 + (i % 2) * 0.1);

      // Deep orange tongue
      this._drawTongue(ctx, tongueX + sway, sy, tongueW, tongueH, t, phase,
        `rgba(255,${80 + i * 10},0,${0.6 * intensity})`,
        `rgba(255,${140 + i * 8},${20 + i * 5},${0.7 * intensity})`);
    }

    // === MID FLAME - bright orange layer ===
    this._drawFlameBody(ctx, sx, sy, baseW * 0.7, baseH * 0.85, t * 1.3, intensity,
      '#ff8800', '#ffaa00', 0.7);

    // === INNER TONGUES - yellow/white hot ===
    for (let i = 0; i < 3; i++) {
      const phase = (i / 3) * Math.PI * 2 + 1;
      const tx = sx + Math.sin(t * 4 + phase) * baseW * 0.2;
      const sway = Math.sin(t * 3 + phase) * baseW * 0.15;
      const th = baseH * (0.4 + i * 0.12) * intensity;
      const tw = baseW * 0.12;

      this._drawTongue(ctx, tx + sway, sy, tw, th, t, phase,
        `rgba(255,220,50,${0.6 * intensity})`,
        `rgba(255,255,180,${0.5 * intensity})`);
    }

    // === WHITE HOT CORE ===
    const coreH = baseH * 0.3 * intensity;
    const coreW = baseW * 0.3;
    const coreG = ctx.createRadialGradient(sx, sy - coreH * 0.2, 0, sx, sy, coreH);
    coreG.addColorStop(0, `rgba(255,255,240,${0.7 * intensity})`);
    coreG.addColorStop(0.4, `rgba(255,240,150,${0.4 * intensity})`);
    coreG.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = coreG;
    ctx.beginPath();
    ctx.ellipse(sx, sy - coreH * 0.1, coreW, coreH * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // === DETACHED FLAME WISPS at top ===
    for (let i = 0; i < 2 + Math.floor(intensity * 2); i++) {
      const wPhase = t * 5 + i * 2.5;
      const wx = sx + Math.sin(wPhase) * baseW * 0.4;
      const wy = sy - baseH * (0.8 + i * 0.15) + Math.sin(wPhase * 0.7) * 5;
      const ws = 3 + intensity * 4 - i * 1.5;
      if (ws <= 0) continue;

      ctx.fillStyle = `rgba(255,${160 + i * 30},0,${0.4 * intensity})`;
      ctx.beginPath();
      // Small teardrop wisp
      ctx.moveTo(wx, wy - ws);
      ctx.bezierCurveTo(wx - ws * 0.4, wy - ws * 0.2, wx - ws * 0.3, wy + ws * 0.3, wx, wy + ws * 0.4);
      ctx.bezierCurveTo(wx + ws * 0.3, wy + ws * 0.3, wx + ws * 0.4, wy - ws * 0.2, wx, wy - ws);
      ctx.fill();
    }

    // === SPARKS ===
    for (const s of this.sparks) {
      const sp = camera.worldToScreen(s.x, s.y);
      const ratio = s.life / s.maxLife;
      ctx.fillStyle = `rgba(255,${Math.floor(200 * ratio)},${Math.floor(50 * ratio)},${ratio})`;
      ctx.beginPath();
      ctx.arc(Math.floor(sp.x), Math.floor(sp.y), s.size * ratio, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawFlameBody(ctx, x, y, w, h, t, intensity, color1, color2, alpha) {
    const a = alpha || 1;
    const c1 = color1 || '#cc3300';
    const c2 = color2 || '#ff6600';

    ctx.save();
    ctx.globalAlpha = a * intensity;

    // Animated bezier flame body shape
    const sway1 = Math.sin(t * 2.5) * w * 0.15;
    const sway2 = Math.sin(t * 3.5 + 1) * w * 0.1;
    const tipSway = Math.sin(t * 4) * w * 0.2;

    const grad = ctx.createLinearGradient(x, y + h * 0.2, x, y - h);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.4, c2);
    grad.addColorStop(0.8, color2 || '#ffaa00');
    grad.addColorStop(1, 'rgba(255,200,50,0.3)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    // Start at base center
    ctx.moveTo(x, y + h * 0.15);
    // Right side of base
    ctx.bezierCurveTo(
      x + w * 0.8, y + h * 0.1,
      x + w + sway1, y - h * 0.2,
      x + w * 0.5 + sway2, y - h * 0.6
    );
    // Top point
    ctx.bezierCurveTo(
      x + w * 0.3 + tipSway, y - h * 0.85,
      x + tipSway * 0.5, y - h * 1.05,
      x + tipSway * 0.3, y - h
    );
    // Left side back down
    ctx.bezierCurveTo(
      x - tipSway * 0.5, y - h * 1.05,
      x - w * 0.3 - sway2, y - h * 0.85,
      x - w * 0.5 - sway1, y - h * 0.6
    );
    ctx.bezierCurveTo(
      x - w - sway2, y - h * 0.2,
      x - w * 0.8, y + h * 0.1,
      x, y + h * 0.15
    );
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawTongue(ctx, x, y, w, h, t, phase, color1, color2) {
    const sway = Math.sin(t * 5 + phase) * w * 0.8;
    const tipSway = Math.sin(t * 7 + phase * 1.5) * w * 0.5;

    const grad = ctx.createLinearGradient(x, y, x, y - h);
    grad.addColorStop(0, color1);
    grad.addColorStop(0.6, color2);
    grad.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(
      x - w * 0.5 + sway, y - h * 0.4,
      x + tipSway, y - h * 0.8,
      x + tipSway * 0.5, y - h
    );
    ctx.bezierCurveTo(
      x - tipSway, y - h * 0.8,
      x + w * 0.5 - sway, y - h * 0.4,
      x + w, y
    );
    ctx.closePath();
    ctx.fill();
  }

  clear() {
    this.tongues = [];
    this.sparks = [];
    this.intensity = 0;
  }
}
