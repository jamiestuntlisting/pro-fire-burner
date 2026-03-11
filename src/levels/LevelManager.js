import { LevelGenerator } from './LevelGenerator.js';
import { TileMap, getThemeForLevel } from './TileMap.js';
import { TILE_SIZE } from '../constants.js';
import { Player, FIRE_STATE } from '../entities/Player.js';
import { Pickup, PICKUP_TYPE } from '../entities/Pickup.js';
import { FireSafety } from '../entities/FireSafety.js';
import { Extra } from '../entities/Extra.js';
import { Principal } from '../entities/Principal.js';
import { FilmCamera } from '../entities/FilmCamera.js';
import { CameraCar } from '../entities/CameraCar.js';
import { Torch } from '../entities/Torch.js';
import { PropaneCannon } from '../entities/PropaneCannon.js';
import { getCostumeForTheme } from '../rendering/SpriteSheet.js';

export class LevelManager {
  constructor() {
    this.levels = [];
    this.currentLevelIndex = 0;
    this.generator = new LevelGenerator();
    this.defaultLevels = null;
  }

  async loadLevels() {
    try {
      const response = await fetch('./src/config/levels.json');
      this.levels = await response.json();
      this.defaultLevels = JSON.parse(JSON.stringify(this.levels));
    } catch (e) {
      console.error('Failed to load levels.json:', e);
      this.levels = [this._defaultLevel()];
      this.defaultLevels = JSON.parse(JSON.stringify(this.levels));
    }
  }

  setLevels(levels) {
    this.levels = levels;
  }

  resetToDefaults() {
    if (this.defaultLevels) {
      this.levels = JSON.parse(JSON.stringify(this.defaultLevels));
    }
  }

  getCurrentLevelConfig() {
    return this.levels[this.currentLevelIndex] || this._defaultLevel();
  }

  getTotalLevels() {
    return this.levels.length;
  }

  setLevel(index) {
    this.currentLevelIndex = Math.max(0, Math.min(index, this.levels.length - 1));
  }

  nextLevel() {
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.currentLevelIndex++;
      return true;
    }
    return false;
  }

  getCheckpointLevel() {
    return Math.floor(this.currentLevelIndex / 4) * 4;
  }

  buildLevel() {
    const config = this.getCurrentLevelConfig();
    const theme = getThemeForLevel(config.theme);
    const generated = this.generator.generate(config);
    const tileMap = new TileMap(generated.data, theme);
    const costume = getCostumeForTheme(config.theme);

    // Create player
    const player = new Player(generated.spawnPoint.x, generated.spawnPoint.y);
    player.setDepletionRates(config.gelDepletionRate, config.fuelDepletionRate);
    player.costumeColor1 = costume.color1;
    player.costumeColor2 = costume.color2;
    player.costumeAccent = costume.accent;

    // Create entities
    const entities = [];
    const ent = generated.entities;

    // Film cameras
    for (const pos of ent.filmCameras) {
      const cam = new FilmCamera(
        pos.col * TILE_SIZE,
        pos.row * TILE_SIZE,
        {
          cameraFOV: config.cameraFOV,
          cameraPanSpeed: config.cameraPanSpeed,
          panRange: (config.mapWidth * TILE_SIZE) / 3,
        }
      );
      entities.push(cam);
    }

    // Fire safeties
    for (const pos of ent.fireSafeties) {
      const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      const angle = angles[Math.floor(Math.random() * angles.length)];
      entities.push(new FireSafety(pos.col * TILE_SIZE, pos.row * TILE_SIZE, angle));
    }

    // Pickups
    for (const pos of ent.gelPickups) {
      entities.push(new Pickup(pos.col * TILE_SIZE - 8, pos.row * TILE_SIZE - 8, PICKUP_TYPE.GEL));
    }
    for (const pos of ent.fuelPickups) {
      entities.push(new Pickup(pos.col * TILE_SIZE - 8, pos.row * TILE_SIZE - 8, PICKUP_TYPE.FUEL));
    }

    // Extras
    for (const pos of ent.extras) {
      entities.push(new Extra(pos.col * TILE_SIZE, pos.row * TILE_SIZE));
    }

    // Principals
    for (const pos of ent.principals) {
      entities.push(new Principal(pos.col * TILE_SIZE, pos.row * TILE_SIZE));
    }

    // Torches
    for (const pos of ent.torches) {
      entities.push(new Torch(pos.col * TILE_SIZE + 12, pos.row * TILE_SIZE));
    }

    // Propane cannons
    for (const pos of ent.propaneCannons) {
      entities.push(new PropaneCannon(pos.col * TILE_SIZE, pos.row * TILE_SIZE));
    }

    // Camera car (race levels only)
    let cameraCar = null;
    if (config.hasCameraCar) {
      cameraCar = new CameraCar(
        generated.spawnPoint.x,
        generated.spawnPoint.y + 450
      );
      entities.push(cameraCar);
    }

    return {
      tileMap,
      player,
      entities,
      cameraCar,
      config,
      theme,
    };
  }

  _defaultLevel() {
    return {
      id: 1,
      theme: 'beach',
      levelType: 'SURVIVAL',
      timeOfDay: 'day',
      costumeDescription: 'Hawaiian shirt',
      mapWidth: 30,
      mapHeight: 30,
      numFireSafeties: 2,
      numGelPickups: 8,
      numFuelPickups: 6,
      hasWaterFeatures: true,
      numTorches: 0,
      numPropaneCannons: 0,
      numExtras: 0,
      numPrincipals: 0,
      cameraFOV: 90,
      cameraPanSpeed: 20,
      gelDepletionRate: 1.5,
      fuelDepletionRate: 1.5,
      hasCameraCar: false,
      timeLimit: 0,
      title: 'BEACH BURN',
      tagline: 'Stay on fire and stay safe!',
    };
  }
}
