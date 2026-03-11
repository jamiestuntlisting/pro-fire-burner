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
    return this.getTileAtWorld(x, y) === TILE_WALL;
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

    switch (tile) {
      case TILE_FLOOR:
        ctx.fillStyle = t.floor;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Subtle grid pattern
        if ((col + row) % 2 === 0) {
          ctx.fillStyle = t.floorAlt;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
        break;
      case TILE_WALL:
        ctx.fillStyle = t.wall;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Brick pattern
        ctx.fillStyle = t.wallDetail;
        if (row % 2 === 0) {
          ctx.fillRect(sx + 7, sy, 2, TILE_SIZE);
        } else {
          ctx.fillRect(sx, sy, 2, TILE_SIZE);
          ctx.fillRect(sx + 14, sy, 2, TILE_SIZE);
        }
        ctx.fillRect(sx, sy, TILE_SIZE, 1);
        break;
      case TILE_WATER:
        ctx.fillStyle = this.waterFrame === 0 ? t.water1 : t.water2;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Wave effect
        ctx.fillStyle = t.waterHighlight;
        const waveOffset = this.waterFrame * 4;
        ctx.fillRect(sx + ((col * 3 + waveOffset) % 12), sy + 4, 4, 1);
        ctx.fillRect(sx + ((col * 7 + waveOffset + 6) % 14), sy + 10, 3, 1);
        break;
      default:
        // Props
        ctx.fillStyle = t.floor;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = t.prop || '#555';
        ctx.fillRect(sx + 3, sy + 3, 10, 10);
        break;
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
