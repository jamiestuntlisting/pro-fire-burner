import { TILE_SIZE } from '../constants.js';

export class CollisionSystem {
  constructor(spatialHash, tileMap) {
    this.spatialHash = spatialHash;
    this.tileMap = tileMap;
  }

  setTileMap(tileMap) {
    this.tileMap = tileMap;
  }

  // AABB overlap test
  aabb(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // Check entity against solid tiles, returns corrected position
  resolveEntityTile(entity, newX, newY) {
    if (!this.tileMap) return { x: newX, y: newY };

    let resolvedX = newX;
    let resolvedY = newY;

    // Try X movement
    if (this._collidesWithWall(resolvedX, entity.y, entity.width, entity.height)) {
      resolvedX = entity.x;
    }

    // Try Y movement
    if (this._collidesWithWall(resolvedX, resolvedY, entity.width, entity.height)) {
      resolvedY = entity.y;
    }

    return { x: resolvedX, y: resolvedY };
  }

  _collidesWithWall(x, y, w, h) {
    // Check all four corners plus midpoints
    const margin = 1;
    const points = [
      { x: x + margin, y: y + margin },
      { x: x + w - margin, y: y + margin },
      { x: x + margin, y: y + h - margin },
      { x: x + w - margin, y: y + h - margin },
      { x: x + w / 2, y: y + margin },
      { x: x + w / 2, y: y + h - margin },
      { x: x + margin, y: y + h / 2 },
      { x: x + w - margin, y: y + h / 2 },
    ];

    for (const p of points) {
      if (this.tileMap.isSolid(p.x, p.y)) {
        return true;
      }
    }
    return false;
  }

  // Check if entity overlaps water
  isOnWater(entity) {
    if (!this.tileMap) return false;
    const cx = entity.getCenterX();
    const cy = entity.getCenterY();
    return this.tileMap.isWater(cx, cy);
  }

  // Query nearby entities of a specific type
  queryNearby(entity, radius, filterType) {
    const nearby = this.spatialHash.queryRadius(
      entity.getCenterX(),
      entity.getCenterY(),
      radius
    );
    const results = [];
    for (const other of nearby) {
      if (other === entity || other.dead) continue;
      if (filterType && !(other instanceof filterType)) continue;
      results.push(other);
    }
    return results;
  }

  // Check AABB overlap between two entities
  entitiesOverlap(a, b) {
    return this.aabb(a.getBounds(), b.getBounds());
  }
}
