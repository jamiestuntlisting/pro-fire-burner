import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

const TIPS = [
  "KEEP MOVING!",
  "DON'T STOP!",
  "MOVE MOVE MOVE!",
  "STAY IN MOTION!",
  "RUN IT OUT!",
  "KEEP YOUR FEET MOVING!",
  "DON'T STAND STILL!",
];

export class StuntCoordinator {
  constructor() {
    this.screenX = VIEWPORT_WIDTH - 80;
    this.screenY = VIEWPORT_HEIGHT - 60;

    this.currentTip = '';
    this.tipTimer = 0;
    this.tipDuration = 3.0;
    this.tipCooldown = 0;
    this.tipAlpha = 0;
    this.stillTimer = 0;
    this.stillThreshold = 1.5;

    this.breatheTimer = 0;
    this.armsCrossed = true;
    this.headNodTimer = 0;
    this.isShouting = false;
  }

  update(dt, playerIsMoving) {
    this.breatheTimer += dt;
    this.headNodTimer += dt;

    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      this.tipAlpha = Math.min(1, this.tipAlpha + dt * 4);
      if (this.tipTimer <= 0.5) this.tipAlpha = this.tipTimer / 0.5;
      this.isShouting = true;
    } else {
      this.tipAlpha = 0;
      this.isShouting = false;
    }

    if (this.tipCooldown > 0) this.tipCooldown -= dt;

    if (!playerIsMoving) {
      this.stillTimer += dt;
      if (this.stillTimer >= this.stillThreshold && this.tipCooldown <= 0) {
        this._showTip();
        this.stillTimer = 0;
      }
    } else {
      this.stillTimer = 0;
    }
  }

  _showTip() {
    this.currentTip = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.tipTimer = this.tipDuration;
    this.tipCooldown = 5.0;
    this.tipAlpha = 0;
  }

  render(ctx) {
    this._renderCharacter(ctx);
    this._renderTip(ctx);
  }

  _renderCharacter(ctx) {
    const x = this.screenX;
    const y = this.screenY;
    const breathe = Math.sin(this.breatheTimer * 1.5) * 1;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 36, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#1a1a2a';
    this._roundRect(ctx, x - 14, y + 20, 10, 16, 3);
    this._roundRect(ctx, x + 4, y + 20, 10, 16, 3);

    // Boots
    ctx.fillStyle = '#111118';
    this._roundRect(ctx, x - 16, y + 32, 12, 5, 2);
    this._roundRect(ctx, x + 4, y + 32, 12, 5, 2);

    // Body - dark tactical vest
    const bodyGrad = ctx.createLinearGradient(x - 18, y - 4, x + 18, y + 24);
    bodyGrad.addColorStop(0, '#1a1a2a');
    bodyGrad.addColorStop(0.5, '#222233');
    bodyGrad.addColorStop(1, '#151525');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, x - 18, y - 4 + breathe, 36, 28, 5);

    // Arms
    if (this.isShouting) {
      ctx.fillStyle = '#d0a878';
      ctx.save();
      ctx.translate(x + 18, y + 4 + breathe);
      ctx.rotate(-0.3);
      ctx.fillRect(0, 0, 20, 6);
      ctx.restore();
      ctx.fillRect(x - 24, y + 10 + breathe, 8, 12);
    } else {
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(x - 16, y + 6 + breathe, 32, 8);
      ctx.fillStyle = '#d0a878';
      ctx.fillRect(x - 12, y + 6 + breathe, 8, 6);
      ctx.fillRect(x + 4, y + 6 + breathe, 8, 6);
    }

    // Neck
    ctx.fillStyle = '#c0a070';
    ctx.fillRect(x - 4, y - 8 + breathe, 8, 6);

    // Head
    const headGrad = ctx.createRadialGradient(x, y - 16, 0, x, y - 16, 12);
    headGrad.addColorStop(0, '#e0c090');
    headGrad.addColorStop(1, '#c0a070');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, x - 10, y - 24, 20, 18, 6);

    // Baseball cap
    const capGrad = ctx.createLinearGradient(x - 12, y - 30, x + 14, y - 20);
    capGrad.addColorStop(0, '#1a1a33');
    capGrad.addColorStop(1, '#2a2a44');
    ctx.fillStyle = capGrad;
    this._roundRect(ctx, x - 10, y - 30, 20, 10, 4);

    // Cap brim
    ctx.fillStyle = '#1a1a33';
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 22);
    ctx.lineTo(x + 16, y - 22);
    ctx.lineTo(x + 18, y - 18);
    ctx.lineTo(x - 14, y - 20);
    ctx.closePath();
    ctx.fill();

    // "STUNTS" text
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STUNTS', x, y - 22);

    // Sunglasses
    ctx.fillStyle = '#0a0a0a';
    this._roundRect(ctx, x - 8, y - 16, 6, 4, 2);
    this._roundRect(ctx, x + 2, y - 16, 6, 4, 2);
    ctx.fillRect(x - 2, y - 15, 4, 2);
    ctx.fillStyle = 'rgba(80,120,200,0.3)';
    ctx.fillRect(x - 6, y - 16, 2, 2);
    ctx.fillRect(x + 4, y - 16, 2, 2);

    // Mouth
    if (this.isShouting) {
      ctx.fillStyle = '#a06850';
      this._roundRect(ctx, x - 4, y - 10, 8, 4, 2);
    }

    // Stubble
    ctx.fillStyle = 'rgba(60,50,30,0.3)';
    ctx.fillRect(x - 4, y - 10, 8, 4);

    ctx.restore();
  }

  _renderTip(ctx) {
    if (this.tipAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.tipAlpha;

    const bubbleX = this.screenX - 110;
    const bubbleY = this.screenY - 48;
    const bubbleW = 100;
    const bubbleH = 24;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this._roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 6);

    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bubbleX + 6, bubbleY);
    ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + bubbleH, 6);
    ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH, 6);
    ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY, 6);
    ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleW, bubbleY, 6);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleW - 8, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + bubbleW + 4, bubbleY + bubbleH + 10);
    ctx.lineTo(bubbleX + bubbleW - 18, bubbleY + bubbleH);
    ctx.closePath();
    ctx.fill();

    const shake = this.isShouting ? Math.sin(this.breatheTimer * 20) * 0.5 : 0;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.currentTip, bubbleX + bubbleW / 2 + shake, bubbleY + 16);

    ctx.globalAlpha = 1;
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
