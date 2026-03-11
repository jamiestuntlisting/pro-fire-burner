import { TILE_SIZE, TILE_FLOOR, TILE_WALL, TILE_WATER, TILE_PROP1, TILE_PROP2, TILE_PROP3 } from '../constants.js';
import { randomInt, randomRange } from '../utils/math.js';

export class LevelGenerator {
  generate(levelConfig) {
    const { mapWidth, mapHeight } = levelConfig;
    const data = this._generateBaseMap(mapWidth, mapHeight, levelConfig);
    const spawnPoint = this._findSpawnPoint(data, mapWidth, mapHeight);
    const entities = this._placeEntities(data, levelConfig, spawnPoint);

    return { data, spawnPoint, entities };
  }

  _generateBaseMap(width, height, config) {
    const data = [];

    // Fill with floor
    for (let row = 0; row < height; row++) {
      data[row] = [];
      for (let col = 0; col < width; col++) {
        data[row][col] = TILE_FLOOR;
      }
    }

    // Border walls
    for (let row = 0; row < height; row++) {
      data[row][0] = TILE_WALL;
      data[row][width - 1] = TILE_WALL;
    }
    for (let col = 0; col < width; col++) {
      data[0][col] = TILE_WALL;
      data[height - 1][col] = TILE_WALL;
    }

    // Interior walls (random placement with corridors)
    const wallClusters = Math.floor((width * height) / 120);
    for (let i = 0; i < wallClusters; i++) {
      const cx = randomInt(3, width - 4);
      const cy = randomInt(3, height - 4);
      const w = randomInt(1, 4);
      const h = randomInt(1, 4);
      for (let row = cy; row < Math.min(cy + h, height - 2); row++) {
        for (let col = cx; col < Math.min(cx + w, width - 2); col++) {
          data[row][col] = TILE_WALL;
        }
      }
    }

    // Water features
    if (config.hasWaterFeatures) {
      const waterCount = randomInt(2, 5);
      for (let i = 0; i < waterCount; i++) {
        const wx = randomInt(4, width - 8);
        const wy = randomInt(4, height - 8);
        const ww = randomInt(3, 6);
        const wh = randomInt(2, 4);
        for (let row = wy; row < Math.min(wy + wh, height - 2); row++) {
          for (let col = wx; col < Math.min(wx + ww, width - 2); col++) {
            data[row][col] = TILE_WATER;
          }
        }
      }
    }

    // Set obstacles / props scattered around the map
    const propTypes = [TILE_PROP1, TILE_PROP2, TILE_PROP3];
    const propCount = Math.floor((width * height) / 40);
    for (let i = 0; i < propCount; i++) {
      const px = randomInt(3, width - 4);
      const py = randomInt(3, height - 4);
      if (data[py][px] === TILE_FLOOR) {
        data[py][px] = propTypes[randomInt(0, propTypes.length - 1)];
      }
    }

    // Ensure spawn area is clear (center-ish)
    const spawnX = Math.floor(width / 2);
    const spawnY = Math.floor(height / 2);
    for (let row = spawnY - 3; row <= spawnY + 3; row++) {
      for (let col = spawnX - 3; col <= spawnX + 3; col++) {
        if (row > 0 && row < height - 1 && col > 0 && col < width - 1) {
          data[row][col] = TILE_FLOOR;
        }
      }
    }

    return data;
  }

  _findSpawnPoint(data, width, height) {
    // Spawn in center
    return {
      x: Math.floor(width / 2) * TILE_SIZE,
      y: Math.floor(height / 2) * TILE_SIZE,
    };
  }

  _placeEntities(data, config, spawnPoint) {
    const entities = {
      fireSafeties: [],
      gelPickups: [],
      fuelPickups: [],
      extras: [],
      principals: [],
      torches: [],
      propaneCannons: [],
      filmCameras: [],
    };

    const placed = []; // Track all placed positions for spacing
    const spawnTileX = Math.floor(spawnPoint.x / TILE_SIZE);
    const spawnTileY = Math.floor(spawnPoint.y / TILE_SIZE);

    const placeMultiple = (count, minSpacing, minDistFromSpawn, list) => {
      for (let i = 0; i < count; i++) {
        const pos = this._findValidPosition(
          data, placed, minSpacing, minDistFromSpawn,
          spawnTileX, spawnTileY
        );
        if (pos) {
          list.push(pos);
          placed.push(pos);
        }
      }
    };

    // Film camera (always one)
    const camPos = {
      col: randomInt(3, data[0].length - 4),
      row: 2,
    };
    entities.filmCameras.push(camPos);

    // Place entities with safety rules
    placeMultiple(config.numFireSafeties || 0, 3, 5, entities.fireSafeties);
    placeMultiple(config.numGelPickups || 0, 2, 3, entities.gelPickups);
    placeMultiple(config.numFuelPickups || 0, 2, 3, entities.fuelPickups);
    placeMultiple(config.numExtras || 0, 2, 5, entities.extras);
    placeMultiple(config.numPrincipals || 0, 2, 5, entities.principals);
    placeMultiple(config.numTorches || 0, 3, 5, entities.torches);
    placeMultiple(config.numPropaneCannons || 0, 3, 5, entities.propaneCannons);

    return entities;
  }

  _findValidPosition(data, placed, minSpacing, minDistFromSpawn, spawnCol, spawnRow) {
    const height = data.length;
    const width = data[0].length;

    for (let attempt = 0; attempt < 50; attempt++) {
      const col = randomInt(2, width - 3);
      const row = randomInt(2, height - 3);

      // Must be on floor
      if (data[row][col] !== TILE_FLOOR) continue;

      // Must be far enough from spawn
      const distFromSpawn = Math.abs(col - spawnCol) + Math.abs(row - spawnRow);
      if (distFromSpawn < minDistFromSpawn) continue;

      // Must be far enough from other placed entities
      let tooClose = false;
      for (const p of placed) {
        const dist = Math.abs(col - p.col) + Math.abs(row - p.row);
        if (dist < minSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      return { col, row };
    }
    return null;
  }
}
