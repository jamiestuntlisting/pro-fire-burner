import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, GEL_MAX, FUEL_MAX, END_REASONS } from '../constants.js';
import { isHighScore } from '../utils/storage.js';

export class GameOverScreen {
  constructor() {
    this.reason = null;
    this.player = null;
    this.filmCamera = null;
    this.levelConfig = null;
    this.selectedOption = 0;
    this.nameEntry = '';
    this.enteringName = false;
    this.finalScore = 0;
    this.timer = 0;
  }

  setup(reason, player, filmCamera, levelConfig) {
    this.reason = reason;
    this.player = player;
    this.filmCamera = filmCamera;
    this.levelConfig = levelConfig;
    this.selectedOption = 0;
    this.nameEntry = '';
    this.timer = 0;
    this.finalScore = this._calculateScore();
    this.enteringName = isHighScore(this.finalScore);
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

    // Name entry
    if (this.enteringName) {
      // Listen for key presses for name
      for (const [code, pressed] of Object.entries(input.keys)) {
        if (pressed && code.startsWith('Key') && this.nameEntry.length < 10) {
          const letter = code.replace('Key', '');
          if (!this._lastKeys) this._lastKeys = {};
          if (!this._lastKeys[code]) {
            this.nameEntry += letter;
          }
          this._lastKeys[code] = true;
        } else if (!pressed && this._lastKeys) {
          this._lastKeys[code] = false;
        }
      }
      if (input.keys['Backspace']) {
        if (!this._backspaceHeld) {
          this.nameEntry = this.nameEntry.slice(0, -1);
          this._backspaceHeld = true;
        }
      } else {
        this._backspaceHeld = false;
      }
      if (input.enterJustPressed && this.nameEntry.length > 0) {
        this.enteringName = false;
        return { action: 'SAVE_SCORE', name: this.nameEntry, score: this.finalScore };
      }
      return null;
    }

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

    // Name entry
    if (this.enteringName) {
      y += 25;
      ctx.fillStyle = '#ffaa00';
      ctx.font = '8px monospace';
      ctx.fillText('NEW HIGH SCORE! ENTER NAME:', cx, y);
      y += 15;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      const displayName = this.nameEntry + (Math.sin(Date.now() / 300) > 0 ? '_' : '');
      ctx.fillText(displayName, cx, y);
    } else {
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
    }

    ctx.textAlign = 'left';
  }
}
