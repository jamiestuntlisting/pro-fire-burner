import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, GEL_MAX, FUEL_MAX, END_REASONS } from '../constants.js';
import { loadHighScores, addHighScore } from '../utils/storage.js';

export class GameOverScreen {
  constructor() {
    this.reason = null;
    this.player = null;
    this.filmCamera = null;
    this.levelConfig = null;
    this.selectedOption = 0;
    this.finalScore = 0;
    this.timer = 0;
    this.placement = 0;
    this.playerName = '';
  }

  setup(reason, player, filmCamera, levelConfig, playerName) {
    this.reason = reason;
    this.player = player;
    this.filmCamera = filmCamera;
    this.levelConfig = levelConfig;
    this.selectedOption = 0;
    this.timer = 0;
    this.playerName = playerName || 'STUNTPERSON';
    this.finalScore = this._calculateScore();

    addHighScore({
      playerName: this.playerName,
      totalScore: this.finalScore,
      highestLevel: this.levelConfig.id,
      date: new Date().toISOString(),
    });

    const scores = loadHighScores();
    this.placement = scores.findIndex(s => s.totalScore === this.finalScore && s.playerName === this.playerName) + 1;
    if (this.placement === 0) this.placement = scores.length;
  }

  _calculateScore() {
    const p = this.player;
    const baseScore = p.secondsOnFire * 100;
    const gelBonus = (p.gel / GEL_MAX) * 200;
    const fuelBonus = (p.fuel / FUEL_MAX) * 150;

    let cameraBonus = 0;
    if (this.filmCamera && p.totalTime > 0) {
      const onCameraPct = Math.max(0, 1 - (this.filmCamera.offCameraTimer / p.totalTime));
      cameraBonus = onCameraPct * 300;
    }

    const extraPenalty = p.extrasBurned * 500;
    const fovPenalty = p.timesFOVLeft * 50;
    const combo = p.comboMultiplier;

    return Math.floor((baseScore * combo) + gelBonus + fuelBonus + cameraBonus - extraPenalty - fovPenalty);
  }

  getIsGameOver() {
    return this.reason && END_REASONS[this.reason] && END_REASONS[this.reason].isGameOver;
  }

  update(dt, input) {
    this.timer += dt;

    const isGameOver = this.getIsGameOver();
    const optionCount = isGameOver ? 2 : 1;

    if (input.keys['ArrowUp'] || input.keys['KeyW']) {
      if (!this._prevUp) {
        this.selectedOption = (this.selectedOption - 1 + optionCount) % optionCount;
      }
      this._prevUp = true;
    } else {
      this._prevUp = false;
    }

    if (input.keys['ArrowDown'] || input.keys['KeyS']) {
      if (!this._prevDown) {
        this.selectedOption = (this.selectedOption + 1) % optionCount;
      }
      this._prevDown = true;
    } else {
      this._prevDown = false;
    }

    // Check for mouse click on options
    if (input._mouseClickY > 0 && isGameOver) {
      const baseY = VIEWPORT_HEIGHT - 80;
      const options = ['TRY AGAIN', 'MAIN MENU'];
      for (let i = 0; i < options.length; i++) {
        const optY = baseY + i * 28;
        if (input._mouseClickY >= optY - 16 && input._mouseClickY <= optY + 8) {
          this.selectedOption = i;
        }
      }
    }

    if (input.enterJustPressed) {
      if (isGameOver) {
        return this.selectedOption === 0 ? { action: 'RETRY' } : { action: 'MENU' };
      } else {
        return { action: 'NEXT_LEVEL' };
      }
    }

    return null;
  }

  render(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const info = END_REASONS[this.reason] || { message: 'LEVEL OVER', icon: '', isGameOver: false };
    const cx = VIEWPORT_WIDTH / 2;

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = info.isGameOver ? '#ff4444' : '#44ff44';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`${info.icon} ${info.message}`, cx, 60);

    // Subtitle - reason why
    if (info.subtitle) {
      ctx.fillStyle = info.isGameOver ? '#cc8888' : '#88cc88';
      ctx.font = '14px monospace';
      ctx.fillText(info.subtitle, cx, 84);
    }

    // Paycheck stub
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(120, 100, VIEWPORT_WIDTH - 240, 300);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('STUNT PAY STUB', cx, 130);

    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    const left = 150;
    let y = 160;
    const p = this.player;

    const baseScore = Math.floor(p.secondsOnFire * 100);
    ctx.fillStyle = '#444444';
    ctx.fillText(`Time on Fire: ${p.secondsOnFire.toFixed(1)}s`, left, y); y += 22;
    ctx.fillText(`Base Pay: $${baseScore}`, left, y); y += 22;
    ctx.fillText(`Gel Bonus: +$${Math.floor((p.gel / GEL_MAX) * 200)}`, left, y); y += 22;
    ctx.fillText(`Fuel Bonus: +$${Math.floor((p.fuel / FUEL_MAX) * 150)}`, left, y); y += 22;
    ctx.fillText(`Combo: x${p.comboMultiplier.toFixed(1)}`, left, y); y += 22;

    if (p.extrasBurned > 0) {
      ctx.fillStyle = '#cc0000';
      ctx.fillText(`Extras Burned: -$${p.extrasBurned * 500} (${p.extrasBurned} people)`, left, y);
      y += 22;
    }

    y += 10;
    ctx.fillStyle = '#999999';
    ctx.fillRect(left, y, VIEWPORT_WIDTH - 300, 1);
    y += 20;

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`YOUR CHECK: $${this.finalScore.toLocaleString()}`, cx, y);

    // High score placement
    y += 40;
    if (this.placement > 0 && this.placement <= 20) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`HIGH SCORE #${this.placement}!`, cx, y);
    }
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px monospace';
    ctx.fillText(`${this.playerName}`, cx, y + 24);

    // Options
    y = VIEWPORT_HEIGHT - 80;
    const isGameOver = this.getIsGameOver();

    if (isGameOver) {
      const options = ['TRY AGAIN', 'MAIN MENU'];
      for (let i = 0; i < options.length; i++) {
        const selected = i === this.selectedOption;
        ctx.fillStyle = selected ? '#ffcc00' : '#888888';
        ctx.font = `${selected ? 'bold ' : ''}18px monospace`;
        ctx.fillText(options[i], cx, y + i * 28);
      }
    } else {
      ctx.fillStyle = '#44ff44';
      ctx.font = 'bold 18px monospace';
      const blink = Math.sin(Date.now() / 300) > 0;
      if (blink) ctx.fillText('CLICK OR PRESS ENTER FOR NEXT LEVEL', cx, y);
    }

    ctx.textAlign = 'left';
  }
}
