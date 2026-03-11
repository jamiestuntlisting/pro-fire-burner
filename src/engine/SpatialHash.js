import { TILE_SIZE } from '../constants.js';

const CELL_SIZE = TILE_SIZE * 4; // 64px

export class SpatialHash {
  constructor() {
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  _key(cx, cy) {
    return (cx * 73856093) ^ (cy * 19349663);
  }

  _cellCoords(x, y) {
    return {
      cx: Math.floor(x / CELL_SIZE),
      cy: Math.floor(y / CELL_SIZE),
    };
  }

  insert(entity) {
    const bounds = entity.getBounds();
    const min = this._cellCoords(bounds.x, bounds.y);
    const max = this._cellCoords(bounds.x + bounds.width, bounds.y + bounds.height);

    for (let cx = min.cx; cx <= max.cx; cx++) {
      for (let cy = min.cy; cy <= max.cy; cy++) {
        const key = this._key(cx, cy);
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
      }
    }
  }

  query(x, y, width, height) {
    const result = new Set();
    const min = this._cellCoords(x, y);
    const max = this._cellCoords(x + width, y + height);

    for (let cx = min.cx; cx <= max.cx; cx++) {
      for (let cy = min.cy; cy <= max.cy; cy++) {
        const key = this._key(cx, cy);
        const cell = this.cells.get(key);
        if (cell) {
          for (const entity of cell) {
            result.add(entity);
          }
        }
      }
    }
    return result;
  }

  queryRadius(x, y, radius) {
    return this.query(x - radius, y - radius, radius * 2, radius * 2);
  }

  rebuild(entities) {
    this.clear();
    for (const entity of entities) {
      if (!entity.dead) {
        this.insert(entity);
      }
    }
  }
}
