import { Entity } from '../engine/Entity.js';
import { TILE_SIZE } from '../constants.js';
import { randomRange } from '../utils/math.js';

export class Producer extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = TILE_SIZE;
    this.height = TILE_SIZE;

    this.moveSpeed = 120;
    this.targetCol = Math.floor(x / TILE_SIZE);
    this.targetRow = Math.floor(y / TILE_SIZE);
    this.state = 'MOVING'; // MOVING or BLOCKING
    this.blockTimer = 0;
    this.repositionTimer = 0;
    this.repositionInterval = randomRange(3, 6);

    this.animTimer = 0;
    this.animFrame = 0;
    this.breatheTimer = Math.random() * Math.PI * 2;
    this.gestureTimer = 0;

    // Registered solid tiles
    this._registeredTiles = [];
    this._tileMap = null;

    // Each producer has slightly different look
    this.suitColor = ['#1a1a2a', '#2a1a1a', '#1a2a1a'][Math.floor(Math.random() * 3)];
    this.tieColor = ['#cc2222', '#2255cc', '#cc8800'][Math.floor(Math.random() * 3)];
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

  _registerTiles(tileMap, playerX, playerY) {
    this._unregisterTiles();
    this._tileMap = tileMap;
    const col = Math.round(this.x / TILE_SIZE);
    const row = Math.round(this.y / TILE_SIZE);

    // Check if player is standing on this tile
    const pCol = Math.floor((playerX) / TILE_SIZE);
    const pRow = Math.floor((playerY) / TILE_SIZE);
    if (col === pCol && row === pRow) return; // don't trap the player

    tileMap.addDynamicSolid(col, row);
    this._registeredTiles.push({ col, row });
  }

  _unregisterTiles() {
    if (!this._tileMap) return;
    for (const t of this._registeredTiles) {
      this._tileMap.removeDynamicSolid(t.col, t.row);
    }
    this._registeredTiles = [];
  }

  _pickTargetTile(tileMap, playerX, playerY, allProducers) {
    const pCol = Math.floor(playerX / TILE_SIZE);
    const pRow = Math.floor(playerY / TILE_SIZE);
    const blockRange = 2; // tiles away from player

    // 8 candidate positions around player
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];

    let bestCol = pCol + blockRange;
    let bestRow = pRow;
    let bestDist = Infinity;

    const myCol = Math.round(this.x / TILE_SIZE);
    const myRow = Math.round(this.y / TILE_SIZE);

    for (const [dx, dy] of dirs) {
      const c = pCol + dx * blockRange;
      const r = pRow + dy * blockRange;

      // Skip wall tiles
      if (tileMap.getTile(c, r) === 1) continue;

      // Skip tiles already claimed by other producers
      let claimed = false;
      for (const p of allProducers) {
        if (p === this || p.dead) continue;
        if (p.targetCol === c && p.targetRow === r) { claimed = true; break; }
      }
      if (claimed) continue;

      const d = Math.abs(c - myCol) + Math.abs(r - myRow); // manhattan distance
      if (d < bestDist) {
        bestDist = d;
        bestCol = c;
        bestRow = r;
      }
    }

    this.targetCol = bestCol;
    this.targetRow = bestRow;
  }

  update(dt, tileMap, playerX, playerY, allProducers) {
    this.animTimer += dt;
    this.breatheTimer += dt;
    this.gestureTimer += dt;
    if (this.animTimer > 0.2) {
      this.animTimer -= 0.2;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    const targetX = this.targetCol * TILE_SIZE;
    const targetY = this.targetRow * TILE_SIZE;

    switch (this.state) {
      case 'MOVING': {
        this._unregisterTiles();
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          // Arrived at target tile
          this._snapToGrid();
          this.state = 'BLOCKING';
          this.blockTimer = 0;
          this.repositionTimer = 0;
          this._registerTiles(tileMap, playerX, playerY);
        } else if (dist > 0) {
          this.x += (dx / dist) * this.moveSpeed * dt;
          this.y += (dy / dist) * this.moveSpeed * dt;
        }
        break;
      }

      case 'BLOCKING': {
        this.blockTimer += dt;
        this.repositionTimer += dt;

        // Re-register tiles each frame (handles player moving away)
        this._registerTiles(tileMap, playerX, playerY);

        // Periodically pick a new target closer to the player
        if (this.repositionTimer >= this.repositionInterval) {
          this.repositionTimer = 0;
          this.repositionInterval = randomRange(3, 6);
          this._unregisterTiles();
          this._pickTargetTile(tileMap, playerX, playerY, allProducers || []);
          this.state = 'MOVING';
        }
        break;
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

    // Scale to fill the tile
    const scale = TILE_SIZE / 24; // base sprite is 24px wide
    const drawOffsetX = (this.width - 24 * scale) / 2;
    const drawOffsetY = (this.height - 48 * scale);
    ctx.translate(baseX + drawOffsetX, baseY + drawOffsetY);
    ctx.scale(scale, scale);

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
      ctx.fillStyle = '#c4a882';
      this._roundRect(ctx, sx - 7 + gesture, sy + 11 + b, 5, 5, 2);
      this._roundRect(ctx, sx + 26 - gesture, sy + 11 + b, 5, 5, 2);
    } else {
      this._roundRect(ctx, sx - 2, sy + 14 + b, 4, 13, 2);
      this._roundRect(ctx, sx + 22, sy + 14 + b, 4, 13, 2);
      // Hands
      ctx.fillStyle = '#c4a882';
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
    ctx.fillStyle = '#b89870';
    ctx.fillRect(sx + 9, sy + 8, 6, 5);

    // === HEAD ===
    const headGrad = ctx.createRadialGradient(cx, sy + 4, 0, cx, sy + 4, 8);
    headGrad.addColorStop(0, '#c4a882');
    headGrad.addColorStop(1, '#a08060');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, sx + 4, sy - 3, 16, 14, 6);

    // Slicked back hair
    ctx.fillStyle = '#1a1a1a';
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
    ctx.fillStyle = '#8a6a4a';
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
