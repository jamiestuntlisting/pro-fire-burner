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
  floor: '#c8b070',
  floorAlt: '#bda865',
  wall: '#6b4e35',
  wallDetail: '#55402a',
  water1: '#2266aa',
  water2: '#1d5b99',
  waterHighlight: '#55aaee',
  prop: '#887755',
};

// Theme palettes for each level
export const LEVEL_THEMES = {
  beach: {
    floor: '#e8d8a0', floorAlt: '#ddd098',
    wall: '#8b7355', wallDetail: '#7a6248',
    water1: '#2288cc', water2: '#1d7ab8',
    waterHighlight: '#66ccff', prop: '#aa9966',
  },
  warehouse: {
    floor: '#555555', floorAlt: '#4d4d4d',
    wall: '#333333', wallDetail: '#2a2a2a',
    water1: '#224466', water2: '#1d3d5d',
    waterHighlight: '#4488aa', prop: '#666655',
  },
  suburban: {
    floor: '#6db36d', floorAlt: '#62a862',
    wall: '#8b6b4a', wallDetail: '#7a5c3e',
    water1: '#3399cc', water2: '#2d8dbf',
    waterHighlight: '#66ccee', prop: '#887766',
  },
  pacman: {
    floor: '#111133', floorAlt: '#0f0f2e',
    wall: '#2222aa', wallDetail: '#1919ff',
    water1: '#000055', water2: '#00004d',
    waterHighlight: '#3333aa', prop: '#ffff00',
  },
  city: {
    floor: '#666666', floorAlt: '#5e5e5e',
    wall: '#444444', wallDetail: '#3a3a3a',
    water1: '#224466', water2: '#1d3d5d',
    waterHighlight: '#4488aa', prop: '#888888',
  },
  backyard: {
    floor: '#5da05d', floorAlt: '#559a55',
    wall: '#8b7355', wallDetail: '#7a6248',
    water1: '#2299dd', water2: '#1d8dcc',
    waterHighlight: '#55ccff', prop: '#7a6b55',
  },
  parkour: {
    floor: '#c8a870', floorAlt: '#bfa068',
    wall: '#887766', wallDetail: '#7a6b5d',
    water1: '#2266aa', water2: '#1d5b99',
    waterHighlight: '#55aaee', prop: '#999888',
  },
  rooftop: {
    floor: '#777777', floorAlt: '#707070',
    wall: '#555555', wallDetail: '#4a4a4a',
    water1: '#2255aa', water2: '#1d4d99',
    waterHighlight: '#4499dd', prop: '#888877',
  },
  war: {
    floor: '#4a5a3a', floorAlt: '#445535',
    wall: '#3a3a3a', wallDetail: '#2f2f2f',
    water1: '#1a3a1a', water2: '#153515',
    waterHighlight: '#2a6a2a', prop: '#555544',
  },
  horror: {
    floor: '#2a1a1a', floorAlt: '#261717',
    wall: '#1a0a0a', wallDetail: '#330000',
    water1: '#1a0a2a', water2: '#150825',
    waterHighlight: '#3a1a4a', prop: '#3a2222',
  },
  gasstation: {
    floor: '#777777', floorAlt: '#707070',
    wall: '#555555', wallDetail: '#4a4a4a',
    water1: '#225566', water2: '#1d4d5d',
    waterHighlight: '#449988', prop: '#aa4444',
  },
  wafflehouse: {
    floor: '#c8a050', floorAlt: '#bf9848',
    wall: '#8b5a2b', wallDetail: '#7a4e22',
    water1: '#554422', water2: '#4d3d1d',
    waterHighlight: '#887755', prop: '#ffcc00',
  },
  protest: {
    floor: '#888888', floorAlt: '#808080',
    wall: '#555555', wallDetail: '#4a4a4a',
    water1: '#2266aa', water2: '#1d5b99',
    waterHighlight: '#55aaee', prop: '#aa5555',
  },
  greenscreen: {
    floor: '#00bb00', floorAlt: '#00b300',
    wall: '#333333', wallDetail: '#2a2a2a',
    water1: '#006600', water2: '#005d00',
    waterHighlight: '#00aa00', prop: '#222222',
  },
  bridge: {
    floor: '#888077', floorAlt: '#807870',
    wall: '#665544', wallDetail: '#5a4a3a',
    water1: '#1166aa', water2: '#0d5d99',
    waterHighlight: '#44aaee', prop: '#776655',
  },
  airplane: {
    floor: '#8888aa', floorAlt: '#8080a2',
    wall: '#555577', wallDetail: '#4a4a6d',
    water1: '#334466', water2: '#2d3d5d',
    waterHighlight: '#557799', prop: '#666688',
  },
};

export function getThemeForLevel(themeId) {
  return LEVEL_THEMES[themeId] || DEFAULT_THEME;
}
