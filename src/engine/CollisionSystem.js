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
  // Uses entity's own width/height as the collision box
  // Includes corner correction to prevent snagging on tile corners
  resolveEntityTile(entity, newX, newY) {
    if (!this.tileMap) return { x: newX, y: newY };

    let resolvedX = newX;
    let resolvedY = newY;
    const w = entity.width;
    const h = entity.height;

    // Try X movement
    const xBlocked = this._collidesWithWall(resolvedX, entity.y, w, h);
    if (xBlocked) resolvedX = entity.x;

    // Try Y movement
    const yBlocked = this._collidesWithWall(resolvedX, resolvedY, w, h);
    if (yBlocked) resolvedY = entity.y;

    // Corner correction: if one axis was blocked, try nudging on the other
    // to slide past tile corners the hitbox barely clips
    const nudge = 4;
    if (xBlocked && !yBlocked) {
      if (!this._collidesWithWall(newX, entity.y - nudge, w, h)) {
        resolvedY -= nudge;
        resolvedX = newX;
      } else if (!this._collidesWithWall(newX, entity.y + nudge, w, h)) {
        resolvedY += nudge;
        resolvedX = newX;
      }
    } else if (yBlocked && !xBlocked) {
      if (!this._collidesWithWall(resolvedX - nudge, newY, w, h)) {
        resolvedX -= nudge;
        resolvedY = newY;
      } else if (!this._collidesWithWall(resolvedX + nudge, newY, w, h)) {
        resolvedX += nudge;
        resolvedY = newY;
      }
    }

    return { x: resolvedX, y: resolvedY };
  }

  _collidesWithWall(x, y, w, h) {
    // Check 4 corners plus center of each edge (6 points)
    // Use 2px margin to prevent getting stuck on tile edges
    const m = 2;
    const points = [
      { x: x + m, y: y + m },          // top-left
      { x: x + w - m, y: y + m },      // top-right
      { x: x + m, y: y + h - m },      // bottom-left
      { x: x + w - m, y: y + h - m },  // bottom-right
      { x: x + w / 2, y: y + m },      // top-center
      { x: x + w / 2, y: y + h - m },  // bottom-center
    ];

    for (const p of points) {
      if (this.tileMap.isSolid(p.x, p.y)) {
        return true;
      }
    }
    return false;
  }

  // Check if entity is on water (checks center and corners of collision box)
  isOnWater(entity) {
    if (!this.tileMap) return false;
    const cx = entity.x + entity.width / 2;
    const cy = entity.y + entity.height / 2;
    const left = entity.x + 2;
    const right = entity.x + entity.width - 2;
    const top = entity.y + 2;
    const bottom = entity.y + entity.height - 2;
    for (const py of [top, cy, bottom]) {
      for (const px of [left, cx, right]) {
        if (this.tileMap.isWater(px, py)) return true;
      }
    }
    return false;
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
