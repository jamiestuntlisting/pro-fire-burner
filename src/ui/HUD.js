import { GEL_MAX, FUEL_MAX, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import { lerpColorMulti } from '../utils/math.js';

const GEL_COLORS = [
  [0, 100, 255],   // blue (full)
  [255, 255, 0],   // yellow
  [255, 165, 0],   // orange
  [255, 0, 0],     // red (empty)
];

const LEVEL_GOALS = {
  SURVIVAL: 'STAY ON FIRE AS LONG AS YOU CAN',
  MARK: 'FIND YOUR MARK BEFORE TIME RUNS OUT',
  RACE: 'OUTRUN THE CAMERA CAR',
};

export class HUD {
  constructor() {
    this.flashTimer = 0;
    this.showMuteHint = true;
    this.goalBannerTimer = 0;
    this.goalBannerDuration = 4.0;
    this.goalBannerShown = false;
  }

  resetGoalBanner() {
    this.goalBannerTimer = 0;
    this.goalBannerShown = false;
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

    // Flame icon
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(x + barWidth + 6, padding + barHeight + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(x + barWidth + 6, padding + barHeight + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Score
    const score = Math.floor(player.secondsOnFire * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${score.toLocaleString()}`, VIEWPORT_WIDTH - padding, padding + 8);

    if (levelConfig) {
      ctx.fillText(`LVL ${levelConfig.id}`, VIEWPORT_WIDTH - padding, padding + 18);
    }

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

    // Timer
    if (timer && levelConfig && levelConfig.timeLimit > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const secs = Math.ceil(timer.remaining);
      ctx.fillText(`TIME: ${secs}s`, VIEWPORT_WIDTH / 2, padding + 20);
    }

    // Goal banner
    if (levelConfig && !this.goalBannerShown) {
      this.goalBannerTimer += 1 / 60;
      this._renderGoalBanner(ctx, levelConfig);
      if (this.goalBannerTimer >= this.goalBannerDuration) {
        this.goalBannerShown = true;
      }
    }

    ctx.textAlign = 'left';
  }

  _renderGoalBanner(ctx, levelConfig) {
    const goalText = LEVEL_GOALS[levelConfig.levelType] || 'BURN BABY BURN';
    const titleText = levelConfig.title || '';

    let alpha = 1;
    if (this.goalBannerTimer < 0.5) {
      alpha = this.goalBannerTimer / 0.5;
    } else if (this.goalBannerTimer > this.goalBannerDuration - 0.8) {
      alpha = (this.goalBannerDuration - this.goalBannerTimer) / 0.8;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;

    const bannerY = 30;
    const bannerH = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, bannerY, VIEWPORT_WIDTH, bannerH);

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, bannerY, VIEWPORT_WIDTH, 1);
    ctx.fillRect(0, bannerY + bannerH - 1, VIEWPORT_WIDTH, 1);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, VIEWPORT_WIDTH / 2, bannerY + 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.fillText(goalText, VIEWPORT_WIDTH / 2, bannerY + 23);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawBar(ctx, x, y, width, height, pct, color, label) {
    ctx.fillStyle = '#222222';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    const fillWidth = (width - 2) * Math.max(0, pct);
    if (fillWidth > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, fillWidth, height - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 1, y + 1, fillWidth, 1);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 2, y + height - 2);
  }
}
