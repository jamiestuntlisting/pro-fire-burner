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

    // Auto-save score and determine placement
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

    // Menu navigation
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
    // Darken background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const info = END_REASONS[this.reason] || { message: 'LEVEL OVER', icon: '', isGameOver: false };
    const cx = VIEWPORT_WIDTH / 2;

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = info.isGameOver ? '#ff4444' : '#44ff44';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${info.icon} ${info.message}`, cx, 35);

    // Paycheck stub styling
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(60, 50, VIEWPORT_WIDTH - 120, 150);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('STUNT PAY STUB', cx, 65);

    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    const left = 75;
    let y = 80;
    const p = this.player;

    const baseScore = Math.floor(p.secondsOnFire * 100);
    ctx.fillStyle = '#444444';
    ctx.fillText(`Time on Fire: ${p.secondsOnFire.toFixed(1)}s`, left, y); y += 10;
    ctx.fillText(`Base Pay: $${baseScore}`, left, y); y += 10;
    ctx.fillText(`Gel Bonus: +$${Math.floor((p.gel / GEL_MAX) * 200)}`, left, y); y += 10;
    ctx.fillText(`Fuel Bonus: +$${Math.floor((p.fuel / FUEL_MAX) * 150)}`, left, y); y += 10;
    ctx.fillText(`Combo: x${p.comboMultiplier.toFixed(1)}`, left, y); y += 10;

    if (p.extrasBurned > 0) {
      ctx.fillStyle = '#cc0000';
      ctx.fillText(`Extras Burned: -$${p.extrasBurned * 500} (${p.extrasBurned} people)`, left, y);
      y += 10;
    }

    y += 5;
    ctx.fillStyle = '#999999';
    ctx.fillRect(left, y, VIEWPORT_WIDTH - 150, 1);
    y += 10;

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`YOUR CHECK: $${this.finalScore.toLocaleString()}`, cx, y);

    // High score placement
    y += 20;
    if (this.placement > 0 && this.placement <= 20) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`HIGH SCORE #${this.placement}!`, cx, y);
    }
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7px monospace';
    ctx.fillText(`${this.playerName}`, cx, y + 12);

    // Options
    y = VIEWPORT_HEIGHT - 40;
    const isGameOver = this.getIsGameOver();

    if (isGameOver) {
      const options = ['TRY AGAIN', 'MAIN MENU'];
      for (let i = 0; i < options.length; i++) {
        const selected = i === this.selectedOption;
        ctx.fillStyle = selected ? '#ffcc00' : '#888888';
        ctx.font = `${selected ? 'bold ' : ''}9px monospace`;
        ctx.fillText(options[i], cx, y + i * 14);
      }
    } else {
      ctx.fillStyle = '#44ff44';
      ctx.font = 'bold 9px monospace';
      const blink = Math.sin(Date.now() / 300) > 0;
      if (blink) ctx.fillText('PRESS ENTER FOR NEXT LEVEL', cx, y);
    }

    ctx.textAlign = 'left';
  }
}
