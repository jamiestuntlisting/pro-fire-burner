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
    const tile = this.getTileAtWorld(x, y);
    return tile === TILE_WALL || tile >= 3; // walls and props are solid
  }

  isWater(x, y) {
    return this.getTileAtWorld(x, y) === TILE_WATER;
  }

  isWalkable(x, y) {
    const tile = this.getTileAtWorld(x, y);
    return tile === TILE_FLOOR || tile === TILE_WATER;
  }

  isWalkableTile(col, row) {
    const tile = this.getTile(col, row);
    return tile === TILE_FLOOR || tile === TILE_WATER;
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
    // Pseudo-random based on tile position for consistent detail
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
        if (r1 > 0.7) {
          ctx.fillRect(sx + r2 * 24, sy + r3 * 24, 12, 1);
        }
        if (r2 > 0.8) {
          ctx.fillRect(sx + r3 * 20, sy + r1 * 30, 1, 10);
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
          // Mortar horizontal line
          ctx.fillStyle = t.wallDetail;
          ctx.fillRect(sx, sy + by, S, 2);
          // Vertical mortar lines
          for (let bx = -offsetX; bx < S; bx += brickW) {
            ctx.fillRect(sx + bx, sy + by, 2, brickH);
            // Individual brick shading
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

        // Top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(sx, sy, S, 1);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(sx, sy + S - 2, S, 2);
        break;

      case TILE_WATER: {
        ctx.fillStyle = this.waterFrame === 0 ? t.water1 : t.water2;
        ctx.fillRect(sx, sy, S, S);

        // Multiple wave lines at different depths
        ctx.fillStyle = t.waterHighlight;
        const wo = this.waterFrame * 6;
        for (let wy = 4; wy < S; wy += 8) {
          const wShift = (col * 5 + wy * 3 + wo) % 20;
          ctx.fillRect(sx + wShift, sy + wy, 8, 1);
          ctx.fillRect(sx + ((wShift + 14) % S), sy + wy + 3, 5, 1);
        }

        // Shimmer highlights
        ctx.fillStyle = 'rgba(100,180,255,0.08)';
        if (r1 > 0.5) {
          ctx.fillRect(sx + r2 * 30, sy + r3 * 30, 6, 3);
        }

        // Depth gradient at edges
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(sx, sy, S, 3);
        ctx.fillRect(sx, sy, 3, S);
        break;
      }
      default: {
        // Props - varied decorative objects
        ctx.fillStyle = (col + row) % 2 === 0 ? t.floorAlt : t.floor;
        ctx.fillRect(sx, sy, S, S);

        // Grout
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(sx, sy, S, 1);
        ctx.fillRect(sx, sy, 1, S);

        const propType = Math.floor(r1 * 4);
        const pc = t.prop || '#555';
        ctx.fillStyle = pc;

        if (propType === 0) {
          // Crate
          ctx.fillRect(sx + 6, sy + 6, 36, 36);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(sx + 6, sy + 6, 36, 2);
          ctx.fillRect(sx + 6, sy + 6, 2, 36);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          // Cross planks
          ctx.fillRect(sx + 6, sy + 22, 36, 3);
          ctx.fillRect(sx + 22, sy + 6, 3, 36);
        } else if (propType === 1) {
          // Barrel
          ctx.beginPath();
          ctx.arc(sx + 24, sy + 24, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.beginPath();
          ctx.arc(sx + 24, sy + 24, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(sx + 10, sy + 22, 28, 3);
        } else if (propType === 2) {
          // Low table / equipment
          ctx.fillRect(sx + 4, sy + 14, 40, 20);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(sx + 4, sy + 14, 40, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(sx + 8, sy + 34, 4, 8);
          ctx.fillRect(sx + 36, sy + 34, 4, 8);
        } else {
          // Debris / rubble pile
          ctx.fillRect(sx + 8, sy + 18, 14, 10);
          ctx.fillRect(sx + 18, sy + 12, 18, 16);
          ctx.fillRect(sx + 12, sy + 24, 22, 12);
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(sx + 20, sy + 12, 14, 2);
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
