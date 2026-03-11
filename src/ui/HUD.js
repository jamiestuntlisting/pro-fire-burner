import { GEL_MAX, FUEL_MAX, VIEWPORT_WIDTH } from '../constants.js';
import { lerpColorMulti } from '../utils/math.js';

const GEL_COLORS = [
  [0, 100, 255],   // blue (full)
  [255, 255, 0],   // yellow
  [255, 165, 0],   // orange
  [255, 0, 0],     // red (empty)
];

export class HUD {
  constructor() {
    this.flashTimer = 0;
    this.showMuteHint = true;
  }

  render(ctx, player, levelConfig, filmCamera, timer) {
    const barWidth = 120;
    const barHeight = 8;
    const padding = 6;
    const x = padding;

    // Gel meter
    const gelPct = player.gel / GEL_MAX;
    const gelColor = lerpColorMulti(GEL_COLORS, 1 - gelPct);
    this._drawBar(ctx, x, padding, barWidth, barHeight, gelPct, gelColor, 'GEL');

    // Fuel meter
    const fuelPct = player.fuel / FUEL_MAX;
    this._drawBar(ctx, x, padding + barHeight + 4, barWidth, barHeight, fuelPct, '#ff6600', 'FUEL');

    // Flame icon next to fuel bar
    ctx.fillStyle = '#ff4400';
    ctx.fillRect(x + barWidth + 4, padding + barHeight + 4, 3, 5);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + barWidth + 5, padding + barHeight + 2, 2, 4);

    // Score (top right)
    const score = Math.floor(player.secondsOnFire * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${score.toLocaleString()}`, VIEWPORT_WIDTH - padding, padding + 8);

    // Level indicator
    if (levelConfig) {
      ctx.fillText(`LVL ${levelConfig.id}`, VIEWPORT_WIDTH - padding, padding + 18);
    }

    // Combo multiplier
    if (player.comboMultiplier > 1.0) {
      ctx.fillStyle = '#ffdd00';
      ctx.fillText(`x${player.comboMultiplier.toFixed(1)}`, VIEWPORT_WIDTH - padding, padding + 28);
    }

    // Camera status
    if (filmCamera) {
      this.flashTimer += 1 / 60;
      const onCamera = filmCamera.playerInFOV;
      if (onCamera) {
        ctx.fillStyle = '#44ff44';
        ctx.textAlign = 'center';
        ctx.fillText('ON CAMERA', VIEWPORT_WIDTH / 2, padding + 8);
      } else {
        const flash = Math.sin(this.flashTimer * 10) > 0;
        if (flash) {
          ctx.fillStyle = '#ff4444';
          ctx.textAlign = 'center';
          ctx.fillText('OFF CAMERA!', VIEWPORT_WIDTH / 2, padding + 8);
        }
      }
    }

    // Timer (MARK levels)
    if (timer && levelConfig && levelConfig.timeLimit > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const secs = Math.ceil(timer.remaining);
      ctx.fillText(`TIME: ${secs}s`, VIEWPORT_WIDTH / 2, padding + 20);
    }

    ctx.textAlign = 'left';
  }

  _drawBar(ctx, x, y, width, height, pct, color, label) {
    // Background
    ctx.fillStyle = '#222222';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, (width - 2) * Math.max(0, pct), height - 2);

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 2, y + height - 2);
  }
}
