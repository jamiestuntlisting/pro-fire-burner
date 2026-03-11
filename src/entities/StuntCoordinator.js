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
    // Position near the bottom-right (by the camera)
    this.screenX = VIEWPORT_WIDTH - 50;
    this.screenY = VIEWPORT_HEIGHT - 40;

    // Tip display
    this.currentTip = '';
    this.tipTimer = 0;
    this.tipDuration = 3.0;
    this.tipCooldown = 0;
    this.tipAlpha = 0;
    this.stillTimer = 0;
    this.stillThreshold = 1.5; // seconds standing still before reminder

    // Animation
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
      if (this.tipTimer <= 0.5) {
        this.tipAlpha = this.tipTimer / 0.5;
      }
      this.isShouting = true;
    } else {
      this.tipAlpha = 0;
      this.isShouting = false;
    }

    if (this.tipCooldown > 0) {
      this.tipCooldown -= dt;
    }

    // Track standing still
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
    const breathe = Math.sin(this.breatheTimer * 1.5) * 0.5;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (wide stance, big guy)
    ctx.fillStyle = '#2a2a3a';
    this._roundRect(ctx, x - 7, y + 10, 5, 8, 2);
    this._roundRect(ctx, x + 2, y + 10, 5, 8, 2);

    // Boots
    ctx.fillStyle = '#1a1a1a';
    this._roundRect(ctx, x - 8, y + 16, 6, 3, 1);
    this._roundRect(ctx, x + 2, y + 16, 6, 3, 1);

    // Body (big, muscular torso)
    const bodyGrad = ctx.createLinearGradient(x - 9, y - 2, x + 9, y + 12);
    bodyGrad.addColorStop(0, '#1a1a2a');
    bodyGrad.addColorStop(0.5, '#222233');
    bodyGrad.addColorStop(1, '#151525');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, x - 9, y - 2 + breathe, 18, 14, 3);

    // Arms crossed over chest
    if (this.isShouting) {
      // One arm pointing, one on hip
      ctx.fillStyle = '#f0c896';
      // Right arm pointing
      ctx.save();
      ctx.translate(x + 9, y + 2 + breathe);
      ctx.rotate(-0.3);
      ctx.fillRect(0, 0, 10, 3);
      ctx.restore();
      // Left arm on hip
      ctx.fillRect(x - 12, y + 5 + breathe, 4, 6);
    } else {
      // Crossed arms
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(x - 8, y + 3 + breathe, 16, 4);
      // Forearms visible
      ctx.fillStyle = '#f0c896';
      ctx.fillRect(x - 6, y + 3 + breathe, 4, 3);
      ctx.fillRect(x + 2, y + 3 + breathe, 4, 3);
    }

    // Neck
    ctx.fillStyle = '#e0b888';
    ctx.fillRect(x - 2, y - 4 + breathe, 4, 3);

    // Head (slightly bigger for big guy)
    const headGrad = ctx.createRadialGradient(x, y - 8, 0, x, y - 8, 6);
    headGrad.addColorStop(0, '#f5d4a8');
    headGrad.addColorStop(1, '#e0b888');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, x - 5, y - 12, 10, 9, 3);

    // Baseball cap with "STUNTS" text
    const capGrad = ctx.createLinearGradient(x - 6, y - 15, x + 7, y - 10);
    capGrad.addColorStop(0, '#222244');
    capGrad.addColorStop(1, '#333355');
    ctx.fillStyle = capGrad;

    // Cap crown
    this._roundRect(ctx, x - 5, y - 15, 10, 5, 2);

    // Cap brim (angled slightly)
    ctx.fillStyle = '#222244';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 11);
    ctx.lineTo(x + 8, y - 11);
    ctx.lineTo(x + 9, y - 9);
    ctx.lineTo(x - 7, y - 10);
    ctx.closePath();
    ctx.fill();

    // "STUNTS" text on cap
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 3px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STUNTS', x, y - 11);

    // Sunglasses
    ctx.fillStyle = '#111111';
    this._roundRect(ctx, x - 4, y - 8, 3, 2, 1);
    this._roundRect(ctx, x + 1, y - 8, 3, 2, 1);
    ctx.fillRect(x - 1, y - 7.5, 2, 1);
    // Lens reflection
    ctx.fillStyle = 'rgba(100,150,255,0.3)';
    ctx.fillRect(x - 3, y - 8, 1, 1);
    ctx.fillRect(x + 2, y - 8, 1, 1);

    // Mouth/chin
    if (this.isShouting) {
      ctx.fillStyle = '#c08060';
      this._roundRect(ctx, x - 2, y - 5, 4, 2, 1);
    }

    // Goatee/stubble
    ctx.fillStyle = 'rgba(80,60,40,0.3)';
    ctx.fillRect(x - 2, y - 5, 4, 2);

    ctx.restore();
  }

  _renderTip(ctx) {
    if (this.tipAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.tipAlpha;

    // Speech bubble from stunt coordinator
    const bubbleX = this.screenX - 70;
    const bubbleY = this.screenY - 28;
    const bubbleW = 65;
    const bubbleH = 16;

    // Bubble background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this._roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 4);

    // Bubble border
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bubbleX + 4, bubbleY);
    ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + bubbleH, 4);
    ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH, 4);
    ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY, 4);
    ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleW, bubbleY, 4);
    ctx.closePath();
    ctx.stroke();

    // Pointer toward coordinator
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleW - 5, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + bubbleW + 3, bubbleY + bubbleH + 6);
    ctx.lineTo(bubbleX + bubbleW - 12, bubbleY + bubbleH);
    ctx.closePath();
    ctx.fill();

    // Tip text
    const shake = this.isShouting ? Math.sin(this.breatheTimer * 20) * 0.5 : 0;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.currentTip, bubbleX + bubbleW / 2 + shake, bubbleY + 11);

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
