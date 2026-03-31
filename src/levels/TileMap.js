import { TILE_SIZE, TILE_FLOOR, TILE_WALL, TILE_WATER, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export class TileMap {
  constructor(data, theme) {
    this.data = data;
    this.rows = data.length;
    this.cols = data[0].length;
    this.widthPx = this.cols * TILE_SIZE;
    this.heightPx = this.rows * TILE_SIZE;
    this.theme = theme || DEFAULT_THEME;
    this.waterFrame = 0;
    this.waterTimer = 0;
    this._dynamicSolids = new Map(); // "col,row" -> ref count
  }

  update(dt) {
    this.waterTimer += dt;
    if (this.waterTimer >= 0.5) {
      this.waterTimer -= 0.5;
      this.waterFrame = (this.waterFrame + 1) % 2;
    }
  }

  getTile(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TILE_WALL;
    return this.data[row][col];
  }

  getTileAtWorld(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this.getTile(col, row);
  }

  isSolid(x, y) {
    if (this.getTileAtWorld(x, y) === TILE_WALL) return true;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this._dynamicSolids.has(`${col},${row}`);
  }

  addDynamicSolid(col, row) {
    const key = `${col},${row}`;
    this._dynamicSolids.set(key, (this._dynamicSolids.get(key) || 0) + 1);
  }

  removeDynamicSolid(col, row) {
    const key = `${col},${row}`;
    const count = (this._dynamicSolids.get(key) || 0) - 1;
    if (count <= 0) {
      this._dynamicSolids.delete(key);
    } else {
      this._dynamicSolids.set(key, count);
    }
  }

  isDynamicSolid(col, row) {
    return this._dynamicSolids.has(`${col},${row}`);
  }

  isWater(x, y) {
    return this.getTileAtWorld(x, y) === TILE_WATER;
  }

  isWalkable(x, y) {
    const tile = this.getTileAtWorld(x, y);
    return tile !== TILE_WALL;
  }

  isWalkableTile(col, row) {
    const tile = this.getTile(col, row);
    return tile !== TILE_WALL;
  }

  render(ctx, camera) {
    const view = camera.getViewBounds();
    const startCol = Math.max(0, Math.floor(view.left / TILE_SIZE));
    const endCol = Math.min(this.cols - 1, Math.ceil(view.right / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(view.top / TILE_SIZE));
    const endRow = Math.min(this.rows - 1, Math.ceil(view.bottom / TILE_SIZE));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.data[row][col];
        const worldX = col * TILE_SIZE;
        const worldY = row * TILE_SIZE;
        const screen = camera.worldToScreen(worldX, worldY);
        const sx = Math.floor(screen.x);
        const sy = Math.floor(screen.y);

        this._renderTile(ctx, tile, sx, sy, col, row);
      }
    }
  }

  _renderTile(ctx, tile, sx, sy, col, row) {
    const t = this.theme;
    const S = TILE_SIZE;
    const hash = ((col * 7 + row * 13) * 2654435761) >>> 0;
    const r1 = (hash & 0xff) / 255;
    const r2 = ((hash >> 8) & 0xff) / 255;
    const r3 = ((hash >> 16) & 0xff) / 255;

    switch (tile) {
      case TILE_FLOOR:
        ctx.fillStyle = (col + row) % 2 === 0 ? t.floorAlt : t.floor;
        ctx.fillRect(sx, sy, S, S);

        // Subtle noise/texture variation
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(sx + r1 * 20, sy + r2 * 20, 8 + r3 * 12, 2);
        ctx.fillRect(sx + r2 * 30, sy + r3 * 25, 2, 6 + r1 * 8);

        // Scuff marks / floor detail
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        if (r1 > 0.7) ctx.fillRect(sx + r2 * 24, sy + r3 * 24, 12, 1);
        if (r2 > 0.8) ctx.fillRect(sx + r3 * 20, sy + r1 * 30, 1, 10);

        // Tape marks on floor (film set gaffer tape)
        if (r1 > 0.92) {
          ctx.fillStyle = 'rgba(200,200,50,0.12)';
          ctx.fillRect(sx + 2, sy + r2 * 30, S - 4, 3);
        }
        if (r2 > 0.95) {
          ctx.fillStyle = 'rgba(200,50,50,0.1)';
          ctx.fillRect(sx + r1 * 20, sy + 2, 3, S - 4);
        }

        // Cable runs on floor
        if (r3 > 0.88 && r1 < 0.5) {
          ctx.strokeStyle = 'rgba(30,30,30,0.15)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy + r2 * S);
          ctx.bezierCurveTo(sx + S * 0.3, sy + r2 * S + 5, sx + S * 0.7, sy + r2 * S - 5, sx + S, sy + r3 * S);
          ctx.stroke();
        }

        // Tile grout lines
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(sx, sy, S, 1);
        ctx.fillRect(sx, sy, 1, S);
        break;

      case TILE_WALL:
        ctx.fillStyle = t.wall;
        ctx.fillRect(sx, sy, S, S);

        // Multi-row brick pattern with mortar
        const brickH = 12;
        const brickW = 24;
        for (let by = 0; by < S; by += brickH) {
          const offsetX = (row + Math.floor(by / brickH)) % 2 === 0 ? 0 : brickW / 2;
          ctx.fillStyle = t.wallDetail;
          ctx.fillRect(sx, sy + by, S, 2);
          for (let bx = -offsetX; bx < S; bx += brickW) {
            ctx.fillRect(sx + bx, sy + by, 2, brickH);
            const bHash = ((col * 3 + bx) * 7 + (row * 5 + by) * 11) & 0xff;
            if (bHash > 200) {
              ctx.fillStyle = 'rgba(255,255,255,0.03)';
              ctx.fillRect(sx + bx + 3, sy + by + 3, brickW - 6, brickH - 5);
            } else if (bHash < 60) {
              ctx.fillStyle = 'rgba(0,0,0,0.05)';
              ctx.fillRect(sx + bx + 3, sy + by + 3, brickW - 6, brickH - 5);
            }
            ctx.fillStyle = t.wallDetail;
          }
        }

        // Pipe / conduit on some walls
        if (r1 > 0.85 && r2 > 0.5) {
          ctx.fillStyle = 'rgba(80,80,80,0.3)';
          ctx.fillRect(sx + 20, sy, 4, S);
          ctx.fillStyle = 'rgba(100,100,100,0.2)';
          ctx.fillRect(sx + 20, sy, 4, 2);
        }

        // Top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(sx, sy, S, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(sx, sy + S - 2, S, 2);
        break;

      case TILE_WATER: {
        ctx.fillStyle = this.waterFrame === 0 ? t.water1 : t.water2;
        ctx.fillRect(sx, sy, S, S);

        // Multiple wave lines
        ctx.fillStyle = t.waterHighlight;
        const wo = this.waterFrame * 6;
        for (let wy = 4; wy < S; wy += 8) {
          const wShift = (col * 5 + wy * 3 + wo) % 20;
          ctx.fillRect(sx + wShift, sy + wy, 8, 1);
          ctx.fillRect(sx + ((wShift + 14) % S), sy + wy + 3, 5, 1);
        }

        // Shimmer highlights
        ctx.fillStyle = 'rgba(100,180,255,0.08)';
        if (r1 > 0.5) ctx.fillRect(sx + r2 * 30, sy + r3 * 30, 6, 3);

        // Caustic light patterns
        if (r2 > 0.6) {
          ctx.fillStyle = 'rgba(120,200,255,0.06)';
          ctx.beginPath();
          ctx.arc(sx + r1 * 40, sy + r3 * 40, 6 + r2 * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Depth gradient at edges
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(sx, sy, S, 3);
        ctx.fillRect(sx, sy, 3, S);
        break;
      }
      default: {
        // Film set equipment on floor
        ctx.fillStyle = (col + row) % 2 === 0 ? t.floorAlt : t.floor;
        ctx.fillRect(sx, sy, S, S);
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(sx, sy, S, 1);
        ctx.fillRect(sx, sy, 1, S);

        const equipType = (tile - 3 + Math.floor(r1 * 5)) % 10;

        if (equipType === 0) {
          // C-Stand with light
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 42, 14, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#555555';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx + 24, sy + 20); ctx.lineTo(sx + 10, sy + 42);
          ctx.moveTo(sx + 24, sy + 20); ctx.lineTo(sx + 38, sy + 42);
          ctx.moveTo(sx + 24, sy + 20); ctx.lineTo(sx + 24, sy + 44);
          ctx.stroke();
          ctx.fillStyle = '#666666';
          ctx.fillRect(sx + 22, sy + 4, 4, 20);
          ctx.fillStyle = '#333333';
          ctx.fillRect(sx + 14, sy + 2, 20, 12);
          ctx.fillStyle = '#888855';
          ctx.fillRect(sx + 16, sy + 4, 16, 8);
          ctx.fillStyle = '#222222';
          ctx.fillRect(sx + 14, sy + 2, 2, 12);
          ctx.fillRect(sx + 32, sy + 2, 2, 12);
          // Light glow
          ctx.fillStyle = 'rgba(255,240,200,0.06)';
          ctx.beginPath();
          ctx.arc(sx + 24, sy + 8, 14, 0, Math.PI * 2);
          ctx.fill();
        } else if (equipType === 1) {
          // Cable coil on ground
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 28, 16, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#222222';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 26, 14, 10, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 26, 8, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx + 38, sy + 26);
          ctx.quadraticCurveTo(sx + 44, sy + 34, sx + 46, sy + 40);
          ctx.stroke();
        } else if (equipType === 2) {
          // Apple box
          ctx.fillStyle = '#8B7355';
          ctx.fillRect(sx + 8, sy + 18, 32, 22);
          ctx.fillStyle = '#9B8365';
          ctx.fillRect(sx + 8, sy + 18, 32, 3);
          ctx.fillStyle = '#7B6345';
          ctx.fillRect(sx + 8, sy + 37, 32, 3);
          ctx.fillStyle = '#5a4a32';
          ctx.fillRect(sx + 14, sy + 26, 8, 6);
          ctx.fillRect(sx + 26, sy + 26, 8, 6);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(sx + 12, sy + 34, 24, 2);
        } else if (equipType === 3) {
          // Sandbag
          ctx.fillStyle = '#6B6040';
          ctx.beginPath();
          ctx.moveTo(sx + 8, sy + 38);
          ctx.lineTo(sx + 12, sy + 22);
          ctx.lineTo(sx + 36, sy + 22);
          ctx.lineTo(sx + 40, sy + 38);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#7B7050';
          ctx.fillRect(sx + 14, sy + 24, 20, 3);
          ctx.strokeStyle = '#554a30';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + 24, sy + 22);
          ctx.lineTo(sx + 24, sy + 16);
          ctx.stroke();
        } else if (equipType === 4) {
          // Light reflector / bounce board
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 42, 10, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#555555';
          ctx.fillRect(sx + 22, sy + 16, 4, 26);
          ctx.fillStyle = '#ccccbb';
          ctx.save();
          ctx.translate(sx + 24, sy + 14);
          ctx.rotate(r2 * 0.5 - 0.25);
          ctx.fillRect(-16, -10, 32, 20);
          ctx.fillStyle = '#ddddcc';
          ctx.fillRect(-14, -8, 28, 16);
          ctx.restore();
        } else if (equipType === 5) {
          // Director's chair
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(sx + 12, sy + 40, 24, 4);
          ctx.fillStyle = '#8B7355';
          ctx.fillRect(sx + 14, sy + 20, 3, 24);
          ctx.fillRect(sx + 31, sy + 20, 3, 24);
          ctx.strokeStyle = '#8B7355';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx + 15, sy + 24); ctx.lineTo(sx + 33, sy + 38);
          ctx.moveTo(sx + 33, sy + 24); ctx.lineTo(sx + 15, sy + 38);
          ctx.stroke();
          ctx.fillStyle = '#1a3a1a';
          ctx.fillRect(sx + 12, sy + 28, 24, 4);
          ctx.fillRect(sx + 12, sy + 16, 24, 6);
          ctx.fillStyle = '#ffcc00';
          ctx.font = '4px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DIRECTOR', sx + 24, sy + 21);
          ctx.textAlign = 'left';
        } else if (equipType === 6) {
          // Film slate / clapperboard on ground
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 36, 14, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(sx + 8, sy + 16, 32, 22);
          ctx.fillStyle = '#eeeeee';
          ctx.fillRect(sx + 10, sy + 22, 28, 14);
          // Clapper stripes
          ctx.fillStyle = '#1a1a1a';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(sx + 10 + i * 8, sy + 16);
            ctx.lineTo(sx + 14 + i * 8, sy + 16);
            ctx.lineTo(sx + 18 + i * 8, sy + 22);
            ctx.lineTo(sx + 14 + i * 8, sy + 22);
            ctx.closePath();
            ctx.fill();
          }
          // Text lines
          ctx.fillStyle = '#333333';
          ctx.fillRect(sx + 12, sy + 25, 20, 1);
          ctx.fillRect(sx + 12, sy + 29, 16, 1);
          ctx.fillRect(sx + 12, sy + 33, 22, 1);
        } else if (equipType === 7) {
          // Monitor on stand (video village)
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.ellipse(sx + 24, sy + 42, 10, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#444444';
          ctx.fillRect(sx + 22, sy + 24, 4, 18);
          // Monitor
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(sx + 8, sy + 6, 32, 20);
          ctx.fillStyle = '#0a2244';
          ctx.fillRect(sx + 10, sy + 8, 28, 16);
          // Screen glow
          ctx.fillStyle = 'rgba(40,80,140,0.15)';
          ctx.fillRect(sx + 10, sy + 8, 28, 16);
          // Scanlines
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          for (let i = 0; i < 8; i++) {
            ctx.fillRect(sx + 10, sy + 8 + i * 2, 28, 1);
          }
          // Power LED
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.arc(sx + 36, sy + 24, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (equipType === 8) {
          // Dolly track section
          ctx.fillStyle = '#555555';
          ctx.fillRect(sx + 2, sy + 16, S - 4, 4);
          ctx.fillRect(sx + 2, sy + 30, S - 4, 4);
          // Cross ties
          ctx.fillStyle = '#444444';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(sx + 8 + i * 14, sy + 14, 4, 22);
          }
          // Rail highlight
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(sx + 2, sy + 16, S - 4, 1);
          ctx.fillRect(sx + 2, sy + 30, S - 4, 1);
        } else {
          // Stinger box (power distribution)
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(sx + 6, sy + 38, 36, 6);
          ctx.fillStyle = '#333333';
          ctx.fillRect(sx + 6, sy + 18, 36, 22);
          ctx.fillStyle = '#444444';
          ctx.fillRect(sx + 6, sy + 18, 36, 3);
          // Outlet holes
          ctx.fillStyle = '#1a1a1a';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(sx + 10 + i * 10, sy + 24, 6, 8);
            // Plugs in some
            if ((hash >> (20 + i)) & 1) {
              ctx.fillStyle = '#666666';
              ctx.fillRect(sx + 11 + i * 10, sy + 25, 4, 6);
              // Cable out
              ctx.strokeStyle = '#222222';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(sx + 13 + i * 10, sy + 31);
              ctx.lineTo(sx + 13 + i * 10, sy + 38);
              ctx.stroke();
              ctx.fillStyle = '#1a1a1a';
            }
          }
          // Warning label
          ctx.fillStyle = '#cc6600';
          ctx.fillRect(sx + 8, sy + 36, 32, 2);
        }
        break;
      }
    }
  }
}

const DEFAULT_THEME = {
  floor: '#3a3a44',
  floorAlt: '#343440',
  wall: '#1e1e28',
  wallDetail: '#16161e',
  water1: '#0a2244',
  water2: '#081d3a',
  waterHighlight: '#1a4466',
  prop: '#2a2a33',
};

// Theme palettes for each level
export const LEVEL_THEMES = {
  beach: {
    floor: '#4a4438', floorAlt: '#44403a',
    wall: '#2a2218', wallDetail: '#221a12',
    water1: '#0a3355', water2: '#082a48',
    waterHighlight: '#1a5577', prop: '#3a3022',
  },
  warehouse: {
    floor: '#2e2e2e', floorAlt: '#282828',
    wall: '#1a1a1a', wallDetail: '#121212',
    water1: '#0a1a2a', water2: '#081522',
    waterHighlight: '#1a3344', prop: '#333328',
  },
  suburban: {
    floor: '#2a4a2a', floorAlt: '#254525',
    wall: '#3a2a1a', wallDetail: '#2e2012',
    water1: '#0a3355', water2: '#082a48',
    waterHighlight: '#1a5577', prop: '#383028',
  },
  pacman: {
    floor: '#0a0a22', floorAlt: '#08081d',
    wall: '#111166', wallDetail: '#0d0daa',
    water1: '#000033', water2: '#00002a',
    waterHighlight: '#1a1a55', prop: '#aaaa00',
  },
  city: {
    floor: '#333338', floorAlt: '#2e2e33',
    wall: '#222228', wallDetail: '#1a1a1e',
    water1: '#0a1a2a', water2: '#081522',
    waterHighlight: '#1a3344', prop: '#444448',
  },
  backyard: {
    floor: '#2a4a2a', floorAlt: '#254525',
    wall: '#3a2a18', wallDetail: '#2e2012',
    water1: '#0a4466', water2: '#083a58',
    waterHighlight: '#1a6688', prop: '#2e2818',
  },
  parkour: {
    floor: '#443a28', floorAlt: '#3e3522',
    wall: '#332e22', wallDetail: '#2a2518',
    water1: '#0a2a55', water2: '#082248',
    waterHighlight: '#1a4466', prop: '#444038',
  },
  rooftop: {
    floor: '#3a3a3e', floorAlt: '#353538',
    wall: '#2a2a2e', wallDetail: '#222226',
    water1: '#0a2255', water2: '#081d48',
    waterHighlight: '#1a4466', prop: '#404038',
  },
  war: {
    floor: '#222a18', floorAlt: '#1e2515',
    wall: '#1a1a1e', wallDetail: '#141418',
    water1: '#0a1a0a', water2: '#081508',
    waterHighlight: '#143314', prop: '#2a2a1e',
  },
  horror: {
    floor: '#1a0e0e', floorAlt: '#160c0c',
    wall: '#0e0505', wallDetail: '#1a0000',
    water1: '#0e0518', water2: '#0a0412',
    waterHighlight: '#1e0a28', prop: '#1e1010',
  },
  gasstation: {
    floor: '#3a3a3e', floorAlt: '#353538',
    wall: '#2a2a2e', wallDetail: '#222226',
    water1: '#0a2233', water2: '#081d2a',
    waterHighlight: '#1a4444', prop: '#552222',
  },
  wafflehouse: {
    floor: '#443820', floorAlt: '#3e3218',
    wall: '#3a2210', wallDetail: '#2e1a0a',
    water1: '#2a1a0a', water2: '#221508',
    waterHighlight: '#443828', prop: '#aa8800',
  },
  protest: {
    floor: '#3a3a3e', floorAlt: '#353538',
    wall: '#2a2a2e', wallDetail: '#222226',
    water1: '#0a2a55', water2: '#082248',
    waterHighlight: '#1a4466', prop: '#552a2a',
  },
  greenscreen: {
    floor: '#005500', floorAlt: '#004d00',
    wall: '#1a1a1e', wallDetail: '#141418',
    water1: '#003300', water2: '#002a00',
    waterHighlight: '#005500', prop: '#111118',
  },
  bridge: {
    floor: '#3a3830', floorAlt: '#353328',
    wall: '#2a2218', wallDetail: '#221a12',
    water1: '#0a3355', water2: '#082a48',
    waterHighlight: '#1a5577', prop: '#332a18',
  },
  airplane: {
    floor: '#3a3a4a', floorAlt: '#353545',
    wall: '#2a2a38', wallDetail: '#222230',
    water1: '#1a2233', water2: '#151d2a',
    waterHighlight: '#2a3344', prop: '#333340',
  },
};

export function getThemeForLevel(themeId) {
  return LEVEL_THEMES[themeId] || DEFAULT_THEME;
}
