import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export class CallSheet {
  constructor() {
    this.levelConfig = null;
    this.ready = false;
  }

  setLevel(config) {
    this.levelConfig = config;
    this.ready = false;
  }

  update(dt, input) {
    if (input.enterJustPressed || input.actionJustPressed) {
      this.ready = true;
      return true;
    }
    return false;
  }

  render(ctx) {
    const config = this.levelConfig;
    if (!config) return;

    // Paper texture background
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Subtle paper grain
    ctx.fillStyle = '#e8e0c8';
    for (let y = 0; y < VIEWPORT_HEIGHT; y += 4) {
      ctx.fillRect(0, y, VIEWPORT_WIDTH, 1);
    }

    const leftMargin = 60;
    let y = 40;

    // Header
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTION CALL SHEET', leftMargin, y);

    y += 10;
    ctx.fillStyle = '#999999';
    ctx.fillRect(leftMargin, y, VIEWPORT_WIDTH - 120, 1);

    y += 28;
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('FIRE BURN SIMULATOR', leftMargin, y);

    y += 36;
    ctx.fillStyle = '#444444';
    ctx.font = '16px monospace';
    ctx.fillText(`LEVEL ${config.id}`, leftMargin, y);

    y += 28;
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(config.title, leftMargin, y);

    y += 36;
    ctx.fillStyle = '#555555';
    ctx.font = '16px monospace';
    ctx.fillText(`TYPE: ${config.levelType}`, leftMargin, y);

    y += 24;
    ctx.fillText(`TIME OF DAY: ${config.timeOfDay.toUpperCase()}`, leftMargin, y);

    y += 24;
    ctx.fillText(`COSTUME: ${config.costumeDescription}`, leftMargin, y);

    if (config.timeLimit > 0) {
      y += 24;
      ctx.fillStyle = '#cc4400';
      ctx.fillText(`TIME LIMIT: ${config.timeLimit}s`, leftMargin, y);
    }

    if (config.hasCameraCar) {
      y += 24;
      ctx.fillStyle = '#cc4400';
      ctx.fillText('WARNING: CAMERA CAR IN PURSUIT', leftMargin, y);
    }

    // Divider
    y += 28;
    ctx.fillStyle = '#999999';
    ctx.fillRect(leftMargin, y, VIEWPORT_WIDTH - 120, 1);

    // Tagline
    y += 32;
    ctx.fillStyle = '#886644';
    ctx.font = 'italic 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`"${config.tagline || 'Stay on fire and stay safe!'}"`, VIEWPORT_WIDTH / 2, y);

    // Continue prompt
    ctx.fillStyle = '#666666';
    ctx.font = '14px monospace';
    const blink = Math.sin(Date.now() / 300) > 0;
    if (blink) {
      ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT - 40);
    }

    ctx.textAlign = 'left';
  }
}
