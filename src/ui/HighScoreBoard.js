import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import { loadHighScores } from '../utils/storage.js';

export class HighScoreBoard {
  constructor() {
    this.scores = [];
    this.timer = 0;
  }

  refresh() {
    this.scores = loadHighScores();
    this.timer = 0;
  }

  update(dt, input) {
    this.timer += dt;
    if (input.enterJustPressed || input.actionJustPressed) {
      return true; // go back
    }
    return false;
  }

  render(ctx) {
    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Title
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH SCORES', VIEWPORT_WIDTH / 2, 40);

    // Divider
    ctx.fillStyle = '#333355';
    ctx.fillRect(80, 52, VIEWPORT_WIDTH - 160, 1);

    if (this.scores.length === 0) {
      ctx.fillStyle = '#555577';
      ctx.font = '16px monospace';
      ctx.fillText('NO SCORES YET', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2);
    } else {
      // Header
      ctx.font = '12px monospace';
      ctx.fillStyle = '#666688';
      ctx.textAlign = 'left';
      ctx.fillText('RANK', 60, 80);
      ctx.fillText('NAME', 140, 80);
      ctx.fillText('SCORE', 340, 80);
      ctx.fillText('LEVEL', 480, 80);

      // Entries
      const maxShow = Math.min(this.scores.length, 20);
      for (let i = 0; i < maxShow; i++) {
        const score = this.scores[i];
        const y = 104 + i * 20;
        const altColor = i % 2 === 0;

        ctx.fillStyle = altColor ? '#8888aa' : '#777799';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${(i + 1).toString().padStart(2, ' ')}.`, 60, y);
        ctx.fillText(score.playerName || '???', 140, y);
        ctx.fillText(`$${score.totalScore.toLocaleString()}`, 340, y);
        ctx.fillText(`${score.highestLevel}`, 480, y);
      }
    }

    // Back prompt
    ctx.fillStyle = '#555555';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    const blink = Math.sin(this.timer * 3) > 0;
    if (blink) {
      ctx.fillText('CLICK OR PRESS ENTER TO GO BACK', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT - 30);
    }

    ctx.textAlign = 'left';
  }
}
