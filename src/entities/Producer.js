import { Entity } from '../engine/Entity.js';
import { TILE_SIZE } from '../constants.js';
import { randomRange } from '../utils/math.js';

export class Producer extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = TILE_SIZE;
    this.height = TILE_SIZE * 2;

    this.moveSpeed = 300;
    this.state = 'MOVING'; // MOVING or BLOCKING
    this.blockRange = 3; // stop when this many tiles from player

    this.animTimer = 0;
    this.animFrame = 0;
    this.breatheTimer = Math.random() * Math.PI * 2;
    this.gestureTimer = 0;

    // Registered solid tiles
    this._registeredTiles = [];
    this._tileMap = null;

    // Each producer has a unique look — diverse ethnicities
    const skinTones = [
      { skin: '#f5d0a9', skinDark: '#d4a574', neck: '#e0b88a', hair: '#2a1a0a' },  // light
      { skin: '#c68642', skinDark: '#a0693d', neck: '#b07540', hair: '#1a1a1a' },  // medium brown
      { skin: '#8d5524', skinDark: '#6b3f1a', neck: '#7a4820', hair: '#0a0a0a' },  // dark brown
      { skin: '#ffdbac', skinDark: '#d4a574', neck: '#e8c49a', hair: '#4a3728' },  // fair
      { skin: '#d4a06a', skinDark: '#b07a42', neck: '#c08e55', hair: '#1a0a00' },  // olive
      { skin: '#6b4226', skinDark: '#4a2e1a', neck: '#5a3820', hair: '#0a0a0a' },  // deep brown
    ];
    const tone = skinTones[Math.floor(Math.random() * skinTones.length)];
    this.skinColor = tone.skin;
    this.skinDark = tone.skinDark;
    this.neckColor = tone.neck;
    this.hairColor = tone.hair;
    this.suitColor = ['#1a1a2a', '#2a1a1a', '#1a2a1a', '#2a2a1a'][Math.floor(Math.random() * 4)];
    this.tieColor = ['#cc2222', '#2255cc', '#cc8800', '#22aa44'][Math.floor(Math.random() * 4)];
    this.hasGlasses = Math.random() > 0.4;
    this.phoneHand = Math.random() > 0.5 ? 'left' : 'right';
  }

  _snapToGrid() {
    const col = Math.round(this.x / TILE_SIZE);
    const row = Math.round(this.y / TILE_SIZE);
    this.x = col * TILE_SIZE;
    this.y = row * TILE_SIZE;
    return { col, row };
  }

  // Register 3 tiles wide (arms out) — center tile + 1 on each side perpendicular to player
  _registerTiles(tileMap, playerX, playerY) {
    this._unregisterTiles();
    this._tileMap = tileMap;
    const col = Math.round(this.x / TILE_SIZE);
    const row = Math.round(this.y / TILE_SIZE);

    // Determine blocking direction (perpendicular to player direction)
    const dx = playerX - this.getCenterX();
    const dy = playerY - this.getCenterY();

    // Block 3 tiles wide x 2 tiles tall (arms out + taller hitbox)
    const tiles = [{ col, row }, { col, row: row + 1 }];
    if (Math.abs(dx) > Math.abs(dy)) {
      // Player is to the left/right — spread vertically
      tiles.push({ col, row: row - 1 });
      tiles.push({ col, row: row + 2 });
    } else {
      // Player is above/below — spread horizontally
      tiles.push({ col: col - 1, row }, { col: col - 1, row: row + 1 });
      tiles.push({ col: col + 1, row }, { col: col + 1, row: row + 1 });
    }

    for (const t of tiles) {
      // Don't register on wall tiles
      if (tileMap.getTile(t.col, t.row) === 1) continue;
      tileMap.addDynamicSolid(t.col, t.row);
      this._registeredTiles.push(t);
    }
  }

  _unregisterTiles() {
    if (!this._tileMap) return;
    for (const t of this._registeredTiles) {
      this._tileMap.removeDynamicSolid(t.col, t.row);
    }
    this._registeredTiles = [];
  }

  update(dt, tileMap, playerX, playerY, allProducers) {
    this.animTimer += dt;
    this.breatheTimer += dt;
    this.gestureTimer += dt;
    if (this.animTimer > 0.2) {
      this.animTimer -= 0.2;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const dx = playerX - cx;
    const dy = playerY - cy;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    const closeRange = TILE_SIZE * this.blockRange;

    if (distToPlayer <= closeRange) {
      // Close to player — stop, block, register as wall
      if (this.state !== 'BLOCKING') {
        this._snapToGrid();
        this.state = 'BLOCKING';
      }
      // Re-register tiles every frame (perpendicular direction may change)
      this._registerTiles(tileMap, playerX, playerY);
    } else {
      // Far from player — chase them
      if (this.state === 'BLOCKING') {
        this._unregisterTiles();
        this.state = 'MOVING';
      }

      if (distToPlayer > 0) {
        const speed = this.moveSpeed * dt;
        let newX = this.x + (dx / distToPlayer) * speed;
        let newY = this.y + (dy / distToPlayer) * speed;

        // Don't walk into walls
        const testX = newX + this.width / 2;
        const testY = newY + this.height / 2;
        if (tileMap && tileMap.isSolid(testX, testY)) {
          // Try just X
          if (!tileMap.isSolid(newX + this.width / 2, this.y + this.height / 2)) {
            this.x = newX;
          }
          // Try just Y
          if (!tileMap.isSolid(this.x + this.width / 2, newY + this.height / 2)) {
            this.y = newY;
          }
        } else {
          this.x = newX;
          this.y = newY;
        }
      }
    }
  }

  destroy() {
    this._unregisterTiles();
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const baseX = Math.floor(screen.x);
    const baseY = Math.floor(screen.y);

    ctx.save();

    // Scale: full width to fill tile, half height for squat look
    const scaleX = TILE_SIZE / 24; // base sprite is 24px wide
    const scaleY = scaleX * 0.5;   // half as tall
    const drawOffsetX = (this.width - 24 * scaleX) / 2;
    const drawOffsetY = -50 + (this.height - 48 * scaleY); // shift hitbox down 50px
    ctx.translate(baseX + drawOffsetX, baseY + drawOffsetY);
    ctx.scale(scaleX, scaleY);

    const sx = 0;
    const sy = 0;
    const cx = sx + 12;
    const b = Math.sin(this.breatheTimer * 2) * 0.5;

    const isWalking = this.state !== 'BLOCKING';
    const legSwing = isWalking ? Math.sin(this.animTimer * 30) * 3 : 0;
    const gesture = this.state === 'BLOCKING' ? Math.sin(this.gestureTimer * 4) * 3 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 48, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // === SHOES - expensive loafers ===
    ctx.fillStyle = '#1a0a00';
    this._roundRect(ctx, sx + 2, sy + 42 + legSwing * 0.3, 7, 5, 2);
    this._roundRect(ctx, sx + 15, sy + 42 - legSwing * 0.3, 7, 5, 2);

    // === LEGS - suit pants ===
    ctx.fillStyle = this.suitColor;
    this._roundRect(ctx, sx + 3, sy + 30 + legSwing * 0.3, 6, 14, 2);
    this._roundRect(ctx, sx + 15, sy + 30 - legSwing * 0.3, 6, 14, 2);

    // === TORSO - expensive suit jacket ===
    const bodyGrad = ctx.createLinearGradient(sx, sy + 12, sx + 24, sy + 32);
    bodyGrad.addColorStop(0, this.suitColor);
    bodyGrad.addColorStop(0.5, this._lightenColor(this.suitColor, 1.3));
    bodyGrad.addColorStop(1, this.suitColor);
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 1, sy + 12 + b, 22, 20, 4);

    // Suit lapels
    ctx.fillStyle = this._lightenColor(this.suitColor, 1.5);
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 13 + b);
    ctx.lineTo(sx + 6, sy + 22 + b);
    ctx.lineTo(sx + 8, sy + 22 + b);
    ctx.lineTo(sx + 12, sy + 16 + b);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 13 + b);
    ctx.lineTo(sx + 18, sy + 22 + b);
    ctx.lineTo(sx + 16, sy + 22 + b);
    ctx.lineTo(sx + 12, sy + 16 + b);
    ctx.closePath();
    ctx.fill();

    // Tie
    ctx.fillStyle = this.tieColor;
    ctx.beginPath();
    ctx.moveTo(sx + 11, sy + 13 + b);
    ctx.lineTo(sx + 13, sy + 13 + b);
    ctx.lineTo(sx + 13.5, sy + 26 + b);
    ctx.lineTo(sx + 12, sy + 28 + b);
    ctx.lineTo(sx + 10.5, sy + 26 + b);
    ctx.closePath();
    ctx.fill();

    // Belt
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(sx + 2, sy + 29 + b, 20, 2);
    ctx.fillStyle = '#ccaa00'; // gold buckle
    this._roundRect(ctx, sx + 9, sy + 28.5 + b, 6, 3, 1);

    // === ARMS ===
    ctx.fillStyle = this.suitColor;
    if (this.state === 'BLOCKING') {
      // Arms out wide - blocking gesture
      this._roundRect(ctx, sx - 6 + gesture, sy + 14 + b, 8, 5, 2);
      this._roundRect(ctx, sx + 22 - gesture, sy + 14 + b, 8, 5, 2);
      // Hands up - "stop" gesture
      ctx.fillStyle = this.skinColor;
      this._roundRect(ctx, sx - 7 + gesture, sy + 11 + b, 5, 5, 2);
      this._roundRect(ctx, sx + 26 - gesture, sy + 11 + b, 5, 5, 2);
    } else {
      this._roundRect(ctx, sx - 2, sy + 14 + b, 4, 13, 2);
      this._roundRect(ctx, sx + 22, sy + 14 + b, 4, 13, 2);
      // Hands
      ctx.fillStyle = this.skinColor;
      this._roundRect(ctx, sx - 1, sy + 25 + b, 3, 3, 1);
      this._roundRect(ctx, sx + 22, sy + 25 + b, 3, 3, 1);
    }

    // Phone in hand
    if (this.phoneHand === 'left' && this.state !== 'BLOCKING') {
      ctx.fillStyle = '#222';
      this._roundRect(ctx, sx - 3, sy + 22 + b, 4, 7, 1);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(sx - 2, sy + 23 + b, 2, 4);
    } else if (this.state !== 'BLOCKING') {
      ctx.fillStyle = '#222';
      this._roundRect(ctx, sx + 22, sy + 22 + b, 4, 7, 1);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(sx + 23, sy + 23 + b, 2, 4);
    }

    // === NECK ===
    ctx.fillStyle = this.neckColor;
    ctx.fillRect(sx + 9, sy + 8, 6, 5);

    // === HEAD ===
    const headGrad = ctx.createRadialGradient(cx, sy + 4, 0, cx, sy + 4, 8);
    headGrad.addColorStop(0, this.skinColor);
    headGrad.addColorStop(1, this.skinDark);
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, sx + 4, sy - 3, 16, 14, 6);

    // Slicked back hair
    ctx.fillStyle = this.hairColor;
    this._roundRect(ctx, sx + 4, sy - 5, 16, 6, 4);
    ctx.fillRect(sx + 4, sy - 3, 2, 3);
    ctx.fillRect(sx + 18, sy - 3, 2, 3);

    // Glasses
    if (this.hasGlasses) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 5, sy + 2, 5, 4);
      ctx.strokeRect(sx + 13, sy + 2, 5, 4);
      ctx.beginPath();
      ctx.moveTo(sx + 10, sy + 4);
      ctx.lineTo(sx + 13, sy + 4);
      ctx.stroke();
      // Lens glare
      ctx.fillStyle = 'rgba(150,200,255,0.3)';
      ctx.fillRect(sx + 6, sy + 2, 2, 2);
      ctx.fillRect(sx + 14, sy + 2, 2, 2);
    }

    // Eyes (behind glasses or not)
    ctx.fillStyle = '#111';
    ctx.fillRect(sx + 7, sy + 3, 2, 2);
    ctx.fillRect(sx + 14, sy + 3, 2, 2);

    // Stern mouth
    ctx.fillStyle = this.skinDark;
    ctx.fillRect(sx + 9, sy + 7, 5, 1.5);

    // === BLOCKING SPEECH BUBBLE ===
    if (this.state === 'BLOCKING') {
      const phrases = ['CUT!', 'STOP!', 'NO!', 'HEY!'];
      const phraseIdx = Math.floor(this.gestureTimer / 2) % phrases.length;
      const bubbleAlpha = 0.7 + Math.sin(this.gestureTimer * 5) * 0.3;

      ctx.globalAlpha = bubbleAlpha;
      ctx.fillStyle = 'white';
      this._roundRect(ctx, sx - 4, sy - 22, 32, 16, 4);
      // Speech tail
      ctx.beginPath();
      ctx.moveTo(sx + 8, sy - 6);
      ctx.lineTo(sx + 12, sy - 2);
      ctx.lineTo(sx + 16, sy - 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#cc0000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(phrases[phraseIdx], cx, sy - 10);
      ctx.globalAlpha = 1;
    }

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

  _lightenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, Math.floor(r * factor))},${Math.min(255, Math.floor(g * factor))},${Math.min(255, Math.floor(b * factor))})`;
  }
}
