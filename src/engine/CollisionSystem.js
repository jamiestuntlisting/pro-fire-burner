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
  // Uses foot hitbox if entity has getFootBounds() (for tall sprites in top-down view)
  // Includes corner correction to prevent snagging on tile corners
  resolveEntityTile(entity, newX, newY) {
    if (!this.tileMap) return { x: newX, y: newY };

    let resolvedX = newX;
    let resolvedY = newY;

    // Use foot hitbox if available (player), otherwise full bounds
    const hasFootBounds = typeof entity.getFootBounds === 'function';
    let offX = 0, offY = 0, w, h;

    if (hasFootBounds) {
      const foot = entity.getFootBounds();
      offX = foot.offsetX;
      offY = foot.offsetY;
      w = foot.width;
      h = foot.height;
    } else {
      w = entity.width;
      h = entity.height;
    }

    const curOffX = entity.x + offX;
    const curOffY = entity.y + offY;

    // Try X movement
    const xBlocked = this._collidesWithWall(resolvedX + offX, curOffY, w, h);
    if (xBlocked) resolvedX = entity.x;

    // Try Y movement
    const yBlocked = this._collidesWithWall(resolvedX + offX, resolvedY + offY, w, h);
    if (yBlocked) resolvedY = entity.y;

    // Corner correction: if one axis was blocked, try nudging on the other
    // to slide past tile corners the hitbox barely clips
    const nudge = 3;
    if (xBlocked && !yBlocked) {
      // Trying to move X but blocked — try nudging Y to slide past corner
      const fx = resolvedX + offX; // still at old X
      const fy = curOffY;
      // Check if nudging up or down un-blocks the X movement
      if (!this._collidesWithWall(newX + offX, fy - nudge, w, h)) {
        resolvedY -= nudge;
        resolvedX = newX;
      } else if (!this._collidesWithWall(newX + offX, fy + nudge, w, h)) {
        resolvedY += nudge;
        resolvedX = newX;
      }
    } else if (yBlocked && !xBlocked) {
      // Trying to move Y but blocked — try nudging X to slide past corner
      const fx = resolvedX + offX;
      const fy = resolvedY + offY; // still at old Y
      if (!this._collidesWithWall(fx - nudge, newY + offY, w, h)) {
        resolvedX -= nudge;
        resolvedY = newY;
      } else if (!this._collidesWithWall(fx + nudge, newY + offY, w, h)) {
        resolvedX += nudge;
        resolvedY = newY;
      }
    }

    return { x: resolvedX, y: resolvedY };
  }

  _collidesWithWall(x, y, w, h) {
    // Check corners plus midpoints of the hitbox
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

  // Check if entity's lower body is in water
  isOnWater(entity) {
    if (!this.tileMap) return false;
    const cx = entity.x + entity.width / 2;
    const left = entity.x + 2;
    const right = entity.x + entity.width - 2;
    // Check multiple Y positions from knees to feet
    const knees = entity.y + entity.height * 0.6;
    const shins = entity.y + entity.height * 0.75;
    const feet = entity.y + entity.height - 2;
    for (const py of [knees, shins, feet]) {
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
