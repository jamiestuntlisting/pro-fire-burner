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
    // World position (set near film camera)
    this.worldX = 0;
    this.worldY = 0;

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

    // Fire state - coordinator pats himself out
    this.onFire = false;
    this.onFireTimer = 0;
    this.patOutDuration = 3.0;
    this.isPattingOut = false;
  }

  catchFire() {
    if (!this.onFire) {
      this.onFire = true;
      this.onFireTimer = 0;
      this.isPattingOut = true;
      this.currentTip = 'I\'M ON FIRE!';
      this.tipTimer = this.patOutDuration;
      this.tipAlpha = 1;
    }
  }

  placeNearCamera(filmCamera) {
    if (!filmCamera) return;
    // 4 tiles to the right of the camera (clearly separate)
    this.worldX = filmCamera.x + filmCamera.width + 4 * 48;
    this.worldY = filmCamera.y;
  }

  update(dt, playerIsMoving, filmCamera) {
    this.breatheTimer += dt;
    this.headNodTimer += dt;

    // Stay 4 tiles to the right of the film camera
    if (filmCamera) {
      this.worldX = filmCamera.x + filmCamera.width + 4 * 48;
      this.worldY = filmCamera.y;
    }

    // Handle on-fire / patting out
    if (this.onFire) {
      this.onFireTimer += dt;
      if (this.onFireTimer >= this.patOutDuration) {
        this.onFire = false;
        this.isPattingOut = false;
        this.currentTip = 'WHEW! THAT WAS CLOSE!';
        this.tipTimer = 2.0;
        this.tipAlpha = 1;
      }
    }

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

  render(ctx, camera) {
    if (!camera) return;
    const screen = camera.worldToScreen(this.worldX, this.worldY);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Check if coordinator is on screen
    const margin = 60;
    const onScreen = sx > -margin && sx < VIEWPORT_WIDTH + margin &&
                     sy > -margin && sy < VIEWPORT_HEIGHT + margin;

    if (onScreen) {
      this._renderCharacter(ctx, sx, sy);
      if (this.onFire) this._renderFireEffect(ctx, sx, sy);
      this._renderTipWorld(ctx, sx, sy);
    } else {
      this._renderOffscreenTip(ctx, sx, sy);
    }
  }

  _renderCharacter(ctx, x, y) {
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

    // Body
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

  _renderFireEffect(ctx, x, y) {
    const t = this.breatheTimer;
    const jitter = Math.sin(t * 15) * 3;
    const progress = Math.min(1, this.onFireTimer / this.patOutDuration);
    const fireAlpha = 1 - progress * 0.8; // Fire fades as he pats it out

    ctx.save();
    ctx.globalAlpha = fireAlpha;

    // Fire glow
    ctx.fillStyle = 'rgba(255,80,0,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Flame tongues
    for (let i = 0; i < 4; i++) {
      const fx = x + Math.sin(t * 8 + i * 1.7) * 10;
      const fy = y - 10 - i * 6 + jitter;
      const sz = 5 + (1 - progress) * 6;
      ctx.fillStyle = `rgba(255,${120 + i * 30},0,${0.5 * fireAlpha})`;
      ctx.beginPath();
      ctx.arc(fx, fy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Patting animation - arms moving fast
    if (this.isPattingOut) {
      const patSpeed = Math.sin(t * 20) * 6;
      ctx.fillStyle = '#d0a878';
      ctx.fillRect(x - 14 + patSpeed, y - 2, 8, 10);
      ctx.fillRect(x + 8 - patSpeed, y - 2, 8, 10);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderTipWorld(ctx, sx, sy) {
    if (this.tipAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.tipAlpha;

    const bubbleW = 140;
    const bubbleH = 28;
    const bubbleX = sx - bubbleW / 2;
    const bubbleY = sy - 64;

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

    // Tail pointing down to character
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.moveTo(sx - 5, bubbleY + bubbleH);
    ctx.lineTo(sx, bubbleY + bubbleH + 10);
    ctx.lineTo(sx + 5, bubbleY + bubbleH);
    ctx.closePath();
    ctx.fill();

    const shake = this.isShouting ? Math.sin(this.breatheTimer * 20) * 0.5 : 0;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.currentTip, sx + shake, bubbleY + 18);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderOffscreenTip(ctx, sx, sy) {
    if (this.tipAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.tipAlpha;

    // Determine which edge to place the indicator
    const pad = 24;
    let edgeX = Math.max(pad + 90, Math.min(VIEWPORT_WIDTH - pad - 90, sx));
    let edgeY = Math.max(pad + 18, Math.min(VIEWPORT_HEIGHT - pad - 18, sy));

    if (sx < 0) edgeX = pad + 90;
    else if (sx > VIEWPORT_WIDTH) edgeX = VIEWPORT_WIDTH - pad - 90;
    if (sy < 0) edgeY = pad + 18;
    else if (sy > VIEWPORT_HEIGHT) edgeY = VIEWPORT_HEIGHT - pad - 18;

    const bubbleW = 180;
    const bubbleH = 32;
    const bubbleX = edgeX - bubbleW / 2;
    const bubbleY = edgeY - bubbleH / 2;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    this._roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 8);

    // Border
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bubbleX + 8, bubbleY);
    ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + bubbleH, 8);
    ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH, 8);
    ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY, 8);
    ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleW, bubbleY, 8);
    ctx.closePath();
    ctx.stroke();

    // Arrow pointing toward the coordinator
    const isLeft = sx < VIEWPORT_WIDTH / 2;
    const arrowX = isLeft ? bubbleX - 2 : bubbleX + bubbleW + 2;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(arrowX, edgeY);
      ctx.lineTo(arrowX + 10, edgeY - 6);
      ctx.lineTo(arrowX + 10, edgeY + 6);
    } else {
      ctx.moveTo(arrowX, edgeY);
      ctx.lineTo(arrowX - 10, edgeY - 6);
      ctx.lineTo(arrowX - 10, edgeY + 6);
    }
    ctx.closePath();
    ctx.fill();

    // Text
    const shake = this.isShouting ? Math.sin(this.breatheTimer * 20) * 0.5 : 0;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.currentTip, edgeX + shake, edgeY + 5);

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
