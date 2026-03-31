import { TICK_RATE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, TILE_SIZE,
  EXTRA_CATCH_RADIUS, PRINCIPAL_CATCH_RADIUS, PROPANE_DRAIN_AMOUNT,
  TORCH_DRAIN_MULTIPLIER, END_REASONS } from './constants.js';
import { Canvas } from './engine/Canvas.js';
import { InputManager } from './engine/InputManager.js';
import { Camera, CAMERA_MODE } from './engine/Camera.js';
import { SpatialHash } from './engine/SpatialHash.js';
import { CollisionSystem } from './engine/CollisionSystem.js';
import { SoundManager } from './engine/SoundManager.js';
import { ParticleSystem } from './engine/ParticleSystem.js';
import { LevelManager } from './levels/LevelManager.js';
import { FireRenderer } from './rendering/FireRenderer.js';
import { TrailRenderer } from './rendering/TrailRenderer.js';
import { AmbientLight } from './rendering/AmbientLight.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';
import { CallSheet } from './ui/CallSheet.js';
import { Countdown } from './ui/Countdown.js';
import { GameOverScreen } from './ui/GameOverScreen.js';
import { HighScoreBoard } from './ui/HighScoreBoard.js';
import { FIRE_STATE } from './entities/Player.js';
import { Pickup, PICKUP_TYPE } from './entities/Pickup.js';
import { FireSafety } from './entities/FireSafety.js';
import { Extra } from './entities/Extra.js';
import { Principal } from './entities/Principal.js';
import { FilmCamera } from './entities/FilmCamera.js';
import { Torch } from './entities/Torch.js';
import { PropaneCannon } from './entities/PropaneCannon.js';
import { PASwarm } from './entities/PASwarm.js';
import { StuntCoordinator } from './entities/StuntCoordinator.js';
import { Producer } from './entities/Producer.js';
import { CountdownTimer } from './utils/timer.js';
import { distance } from './utils/math.js';

const STATES = {
  MENU: 'MENU',
  NAME_ENTRY: 'NAME_ENTRY',
  CALL_SHEET: 'CALL_SHEET',
  LIGHTING_UP: 'LIGHTING_UP',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  END_ANIMATION: 'END_ANIMATION',
  PA_ATTACK: 'PA_ATTACK',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER',
  HIGH_SCORE: 'HIGH_SCORE',
  ADMIN_PANEL: 'ADMIN_PANEL',
};

const END_ANIMS = {
  BURNED: { duration: 1.5, label: 'BURNED UP!' },
  BURNED_NO_FUEL: { duration: 1.5, label: 'FLAME OUT!' },
  BURNED_EXTINGUISHED: { duration: 1.5, label: 'EXTINGUISHED!' },
  EXTINGUISHED: { duration: 1.5, label: 'PUT OUT!' },
  FELL_IN_WATER: { duration: 1.5, label: 'FELL IN WATER!' },
  ROADKILL: { duration: 1.2, label: 'ROADKILL!' },
  LOST_THE_SHOT: { duration: 1.2, label: 'LOST THE SHOT!' },
  CLEAN_BURN: { duration: 2.0, label: 'CLEAN BURN!' },
  SAFE_OUT: { duration: 1.5, label: 'SAFE OUT!' },
};

// How long the performer must survive before fire safeties chase
const SURVIVE_TIME = 15;
// How many fire safeties spawn for the chase phase
const CHASE_SAFETY_COUNT = 4;
// Overtime thresholds (seconds after survive time)
const OVERTIME_1_5X_TIME = SURVIVE_TIME;       // 1.5x starts when survive timer ends
const OVERTIME_2X_TIME = SURVIVE_TIME + 15;     // 2x starts 15s after overtime begins
const PRODUCER_COUNT = 3;

export class Game {
  constructor() {
    this.canvas = new Canvas('game-canvas');
    this.ctx = this.canvas.getContext();
    this.input = new InputManager(this.canvas);
    this.camera = new Camera();
    this.spatialHash = new SpatialHash();
    this.collisionSystem = new CollisionSystem(this.spatialHash, null);
    this.soundManager = new SoundManager();
    this.particles = new ParticleSystem();
    this.levelManager = new LevelManager();

    this.fireRenderer = new FireRenderer();
    this.trailRenderer = new TrailRenderer();
    this.ambientLight = new AmbientLight();
    this.hud = new HUD();

    this.mainMenu = new MainMenu();
    this.callSheet = new CallSheet();
    this.countdown = new Countdown();
    this.gameOverScreen = new GameOverScreen();
    this.highScoreBoard = new HighScoreBoard();

    this.stuntCoordinator = new StuntCoordinator();

    this.state = STATES.MENU;
    this.player = null;
    this.tileMap = null;
    this.entities = [];
    this.filmCamera = null;
    this.cameraCar = null;
    this.paSwarm = null;
    this.levelConfig = null;
    this.levelTimer = null;
    this.endReason = null;

    this.endAnimTimer = 0;
    this.endAnimDuration = 1.5;

    this.fadeAlpha = 0;
    this.fadeDirection = 0;
    this.fadeCallback = null;

    this.hitStopFrames = 0;

    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;

    this.playerName = '';

    // Survive countdown timer
    this.surviveTimer = 0;
    this.chaseStarted = false;

    // Overtime system
    this.overtimeLevel = 0; // 0 = normal, 1 = 1.5x, 2 = 2x
    this.producersSpawned = false;
  }

  async init() {
    await this.levelManager.loadLevels();
    this.soundManager.init();

    window.addEventListener('keydown', (e) => {
      this.mainMenu.checkKonami(e.code);
    });

    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  gameLoop(now) {
    if (!this.running) return;

    const frameTime = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.accumulator += frameTime;

    this.input.update();

    while (this.accumulator >= TICK_RATE) {
      if (this.hitStopFrames > 0) {
        this.hitStopFrames--;
      } else {
        this.update(TICK_RATE);
      }
      this.accumulator -= TICK_RATE;
    }

    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  fadeToState(newState, setupFn) {
    this.fadeDirection = 1;
    this.fadeCallback = () => {
      if (setupFn) setupFn();
      this.state = newState;
      this.fadeDirection = -1;
    };
  }

  startLevel() {
    const result = this.levelManager.buildLevel();
    this.tileMap = result.tileMap;
    this.player = result.player;
    this.entities = result.entities;
    this.cameraCar = result.cameraCar;
    this.levelConfig = result.config;
    this.endReason = null;
    this.paSwarm = null;

    this.collisionSystem.setTileMap(this.tileMap);
    this.camera.setMapBounds(this.tileMap.widthPx, this.tileMap.heightPx);
    this.camera.x = this.player.getCenterX() - VIEWPORT_WIDTH / 2;
    this.camera.y = this.player.getCenterY() - VIEWPORT_HEIGHT / 2;
    this.camera.targetZoom = 0.27;
    this.camera.zoom = 0.27;
    this.ambientLight.setTimeOfDay(this.levelConfig.timeOfDay);

    this.camera.setFollowMode();

    this.fireRenderer.clear();
    this.trailRenderer.clear();
    this.particles.clear();

    this.filmCamera = this.entities.find(e => e instanceof FilmCamera) || null;

    if (this.levelConfig.timeLimit > 0) {
      this.levelTimer = new CountdownTimer(this.levelConfig.timeLimit);
    } else {
      this.levelTimer = null;
    }

    this.stuntCoordinator = new StuntCoordinator();
    this.hud.resetGoalBanner();

    // Reset survive/chase state
    this.surviveTimer = 0;
    this.chaseStarted = false;
    this.overtimeLevel = 0;
    this.producersSpawned = false;
  }

  endLevel(reason) {
    if (this.endReason) return;
    this.endReason = reason;

    if (reason === 'PA_ATTACK') {
      this.paSwarm = new PASwarm();
      this.paSwarm.activate(this.player.getCenterX(), this.player.getCenterY(), this.camera);
      this.state = STATES.PA_ATTACK;
      this.camera.shake(6, 0.5);
      return;
    }

    const animConfig = END_ANIMS[reason] || { duration: 1.5, label: reason };
    this.endAnimTimer = 0;
    this.endAnimDuration = animConfig.duration;
    this.state = STATES.END_ANIMATION;

    if (reason === 'FELL_IN_WATER') {
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 30, {
        r: 100, g: 150, b: 255, life: 1.0, spread: 150,
      });
      this.soundManager.playSplash();
    } else if (reason === 'CLEAN_BURN') {
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 20, {
        r: 255, g: 255, b: 100, life: 1.5, spread: 90,
      });
    }

    const info = END_REASONS[reason];
    if (info && info.isGameOver) {
      this.soundManager.playGameOver();
      this.camera.shake(3, 0.3);
    }

    if (reason === 'EXTINGUISHED' || reason === 'BURNED_EXTINGUISHED' || reason === 'FELL_IN_WATER' || reason === 'SAFE_OUT') {
      this.player.extinguish();
      this.soundManager.playExtinguish();
    }
  }

  update(dt) {
    if (this.fadeDirection !== 0) {
      this.fadeAlpha += this.fadeDirection * dt * 3;
      if (this.fadeAlpha >= 1.0 && this.fadeDirection === 1) {
        this.fadeAlpha = 1.0;
        if (this.fadeCallback) {
          this.fadeCallback();
          this.fadeCallback = null;
        }
      } else if (this.fadeAlpha <= 0 && this.fadeDirection === -1) {
        this.fadeAlpha = 0;
        this.fadeDirection = 0;
      }
    }

    switch (this.state) {
      case STATES.MENU: this._updateMenu(dt); break;
      case STATES.NAME_ENTRY: this._updateNameEntry(dt); break;
      case STATES.CALL_SHEET: this._updateCallSheet(dt); break;
      case STATES.LIGHTING_UP: this._updateLightingUp(dt); break;
      case STATES.COUNTDOWN: this._updateCountdown(dt); break;
      case STATES.PLAYING: this._updatePlaying(dt); break;
      case STATES.END_ANIMATION: this._updateEndAnimation(dt); break;
      case STATES.PA_ATTACK: this._updatePAAttack(dt); break;
      case STATES.LEVEL_COMPLETE:
      case STATES.GAME_OVER: this._updateGameOver(dt); break;
      case STATES.HIGH_SCORE: this._updateHighScore(dt); break;
    }
  }

  _updateMenu(dt) {
    this.input.setGameControlsVisible(false);
    const choice = this.mainMenu.update(dt, this.input);
    if (choice === 'NEW GAME') {
      this.levelManager.setLevel(0);
      this.playerName = 'STUNTPERSON';
      this.fadeToState(STATES.CALL_SHEET, () => {
        this.callSheet.setLevel(this.levelManager.getCurrentLevelConfig());
      });
    } else if (choice === 'HIGH SCORES') {
      this.fadeToState(STATES.HIGH_SCORE, () => {
        this.highScoreBoard.refresh();
      });
    } else if (choice === 'ADMIN') {
      this.state = STATES.ADMIN_PANEL;
      this._openAdmin();
    }
  }

  _updateNameEntry(dt) {
    this.input.setGameControlsVisible(false);
    this.playerName = this.input.getMobileNameValue();

    if (this.input.enterJustPressed && this.playerName.length > 0) {
      this.input.endNameEntry();
      this.fadeToState(STATES.CALL_SHEET, () => {
        this.callSheet.setLevel(this.levelManager.getCurrentLevelConfig());
      });
    }
  }

  _openAdmin() {
    import('./ui/AdminPanel.jsx').then(({ createAdminPanel }) => {
      const container = document.getElementById('admin-root');
      createAdminPanel(container, this.levelManager, () => {
        this.state = STATES.MENU;
      });
    });
  }

  _updateCallSheet(dt) {
    if (this.callSheet.update(dt, this.input)) {
      this.fadeToState(STATES.LIGHTING_UP, () => {
        this.startLevel();
        // Start the lighting-up animation
        this.player.startLightingUp();
      });
    }
  }

  _updateLightingUp(dt) {
    this.input.setGameControlsVisible(false);
    this.player.update(dt, null, this.collisionSystem);

    this.camera.follow(this.player);
    this.camera.update(dt);

    // Update fire renderer with growing intensity during light-up
    const intensity = this.player.getFlameIntensity();
    this.fireRenderer.update(dt, this.player.x, this.player.y + this.player.getSpriteOffsetY(), intensity);
    this.particles.update(dt);

    // When lighting-up animation completes, transition to countdown
    if (this.player.lightUpTimer >= this.player.lightUpDuration) {
      this.state = STATES.COUNTDOWN;
      this.countdown.reset(this.soundManager);
    }
  }

  _updateCountdown(dt) {
    this.input.setGameControlsVisible(false);

    // Keep fire going during countdown
    const intensity = this.player.getFlameIntensity();
    this.fireRenderer.update(dt, this.player.x, this.player.y + this.player.getSpriteOffsetY(), intensity);

    if (this.countdown.update(dt)) {
      this.state = STATES.PLAYING;
      this.input.setGameControlsVisible(true);
      this.player.ignite();
      if (this.levelTimer) this.levelTimer.start();
      if (this.cameraCar) this.cameraCar.activate();

      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 40, {
        r: 255, g: 150, b: 0, life: 0.8, spread: 180,
      });
      this.soundManager.playIgnition();

      this.camera.zoomTo(0.30);
      setTimeout(() => this.camera.zoomTo(0.27), 300);
    }
    this.camera.follow(this.player);
    this.camera.update(dt);
  }

  _updatePlaying(dt) {
    this.tileMap.update(dt);
    this.player.update(dt, this.input, this.collisionSystem);

    this.camera.follow(this.player);
    this.camera.update(dt);

    this.spatialHash.rebuild(this.entities);

    const px = this.player.getCenterX();
    const py = this.player.getCenterY();

    const allProducers = this.entities.filter(e => e instanceof Producer && !e.dead);

    for (const entity of this.entities) {
      if (entity.dead) continue;

      if (entity instanceof FireSafety) {
        entity.setPlayerPosition(px, py);
        entity.update(dt);
      } else if (entity instanceof Producer) {
        entity.update(dt, this.tileMap, px, py, allProducers);
      } else if (entity instanceof Extra || entity instanceof Principal) {
        entity.update(dt, this.tileMap);
      } else {
        entity.update(dt);
      }
    }

    if (this.cameraCar && this.cameraCar.active) {
      this.cameraCar.update(dt, this.player.y);
    }

    if (this.levelTimer) {
      this.levelTimer.update(dt);
      if (this.levelTimer.isExpired()) {
        this.endLevel('BURNED');
        return;
      }
    }

    // Survive countdown and overtime escalation
    if (this.player.isOnFire()) {
      this.surviveTimer += dt;
      if (!this.chaseStarted && this.surviveTimer >= SURVIVE_TIME) {
        this.chaseStarted = true;
        this._spawnChaseSafeties();
      }

      // Overtime escalation
      if (this.surviveTimer >= OVERTIME_2X_TIME && this.overtimeLevel < 2) {
        this.overtimeLevel = 2;
        this.player.drainMultiplier = Math.max(this.player.drainMultiplier, 2.0);
        if (!this.producersSpawned) {
          this.producersSpawned = true;
          this._spawnProducers();
        }
      } else if (this.surviveTimer >= OVERTIME_1_5X_TIME && this.overtimeLevel < 1) {
        this.overtimeLevel = 1;
        this.player.drainMultiplier = Math.max(this.player.drainMultiplier, 1.5);
      }
    }

    if (this.player.isOnFire()) {
      this._checkPlayingCollisions(dt);
    }

    // Pickup collection - always active, not just when on fire
    this._checkPickupCollection();


    const intensity = this.player.getFlameIntensity();
    this.fireRenderer.update(dt, this.player.x, this.player.y + this.player.getSpriteOffsetY(), intensity);
    this.trailRenderer.update(dt, this.player.x, this.player.y + this.player.getSpriteOffsetY(), this.player.isMoving, intensity);
    this.particles.update(dt);

    this.stuntCoordinator.update(dt, this.player.isMoving, this.filmCamera);

    // Check camera/coordinator proximity - fire spreads
    this._checkFireSpread(px, py);

    if (this.player.gel <= 0) {
      this.endLevel(this._beingSprayedByFireSafety ? 'BURNED_EXTINGUISHED' : 'BURNED');
    } else if (this.player.fuel <= 0) {
      this.endLevel(this._beingSprayedByFireSafety ? 'BURNED_EXTINGUISHED' : 'BURNED_NO_FUEL');
    }

    if (this.collisionSystem.isOnWater(this.player) && this.player.isOnFire()) {
      this.endLevel('FELL_IN_WATER');
    }

    this.entities = this.entities.filter(e => !e.dead);
  }

  _spawnChaseSafeties() {
    // Spawn 4 fire safeties at edges of the map, they chase the player
    const px = this.player.x;
    const py = this.player.y;
    const offsets = [
      { x: -TILE_SIZE * 8, y: -TILE_SIZE * 8 },
      { x: TILE_SIZE * 8, y: -TILE_SIZE * 8 },
      { x: -TILE_SIZE * 8, y: TILE_SIZE * 8 },
      { x: TILE_SIZE * 8, y: TILE_SIZE * 8 },
    ];

    for (const off of offsets) {
      const sx = Math.max(TILE_SIZE * 2, Math.min(this.tileMap.widthPx - TILE_SIZE * 3, px + off.x));
      const sy = Math.max(TILE_SIZE * 2, Math.min(this.tileMap.heightPx - TILE_SIZE * 3, py + off.y));
      const angle = Math.atan2(py - sy, px - sx);
      const safety = new FireSafety(sx, sy, angle);
      safety.followSpeed = safety.followSpeed * 3; // Chase safeties move faster
      safety.followDistance = TILE_SIZE * 2; // Get closer before spraying
      this.entities.push(safety);
    }

    this.camera.shake(4, 0.5);
  }

  _checkPickupCollection() {
    // Use distance-based collection with generous radius
    // Visual pickup center is at (x+18, y+18), not (x+32, y+32)
    const playerCX = this.player.x + this.player.width / 2;
    const playerCY = this.player.y + this.player.height / 2;
    const pickupRadius = 52;

    for (const entity of this.entities) {
      if (entity.dead || !(entity instanceof Pickup)) continue;
      // Match the visual center of the pickup sprite (rendered at x+18, y+18)
      const pickupCX = entity.x + 18;
      const pickupCY = entity.y + 18;
      const dx = playerCX - pickupCX;
      const dy = playerCY - pickupCY;
      if (dx * dx + dy * dy < pickupRadius * pickupRadius) {
        if (entity.type === PICKUP_TYPE.GEL) {
          this.player.addGel();
          this.soundManager.playGelPickup();
        } else {
          this.player.addFuel();
          this.soundManager.playFuelPickup();
        }
        entity.collect();
      }
    }
  }

  _spawnProducers() {
    const px = this.player.x;
    const py = this.player.y;
    for (let i = 0; i < PRODUCER_COUNT; i++) {
      const angle = (i / PRODUCER_COUNT) * Math.PI * 2;
      const spawnDist = TILE_SIZE * 8;
      let sx = Math.round((px + Math.cos(angle) * spawnDist) / TILE_SIZE) * TILE_SIZE;
      let sy = Math.round((py + Math.sin(angle) * spawnDist) / TILE_SIZE) * TILE_SIZE;
      sx = Math.max(TILE_SIZE * 2, Math.min(this.tileMap.widthPx - TILE_SIZE * 3, sx));
      sy = Math.max(TILE_SIZE * 2, Math.min(this.tileMap.heightPx - TILE_SIZE * 3, sy));
      const producer = new Producer(sx, sy);
      this.entities.push(producer);
    }
    this.camera.shake(3, 0.4);
  }

  // Producers register as solid tiles - no separate collision needed

  _checkFireSpread(px, py) {
    // Camera catches fire if performer gets too close
    if (this.filmCamera && !this.filmCamera.onFire && this.player.isOnFire()) {
      const camDist = distance(px, py, this.filmCamera.getCenterX(), this.filmCamera.getCenterY());
      if (camDist < TILE_SIZE * 1.5) {
        this.filmCamera.catchFire();
        this.particles.emitBurst(this.filmCamera.getCenterX(), this.filmCamera.getCenterY(), 15, {
          r: 255, g: 100, b: 0, life: 0.8, spread: 60,
        });
      }
    }

    // Coordinator catches fire if performer gets too close - he pats himself out
    if (this.player.isOnFire()) {
      const coordDist = distance(px, py, this.stuntCoordinator.worldX, this.stuntCoordinator.worldY);
      if (coordDist < TILE_SIZE * 1.5 && !this.stuntCoordinator.onFire) {
        this.stuntCoordinator.catchFire();
        this.particles.emitBurst(this.stuntCoordinator.worldX, this.stuntCoordinator.worldY, 10, {
          r: 255, g: 120, b: 0, life: 0.6, spread: 40,
        });
      }
    }
  }

  _checkPlayingCollisions(dt) {
    const px = this.player.getCenterX();
    const py = this.player.getCenterY();
    this._beingSprayedByFireSafety = false;

    let pendingEnd = null;
    let pendingPriority = 99;

    const tryEnd = (reason) => {
      const p = END_REASONS[reason].priority;
      if (p < pendingPriority) {
        pendingPriority = p;
        pendingEnd = reason;
      }
    };

    for (const entity of this.entities) {
      if (entity.dead) continue;
      if (entity instanceof FireSafety) {
        if (entity.isPlayerInSpray(px, py)) {
          this.player.fuel -= entity.fuelDrainRate * dt;
          this.player.fuel = Math.max(0, this.player.fuel);
          this.player.gel -= entity.fuelDrainRate * 0.3 * dt;
          this.player.gel = Math.max(0, this.player.gel);
          this._beingSprayedByFireSafety = true;
        }
      }
    }

    if (this.filmCamera) {
      const lostShot = this.filmCamera.updatePlayerTracking(px, py, dt);
      if (lostShot) {
        tryEnd('LOST_THE_SHOT');
        this.player.timesFOVLeft++;
      }
    }

    if (this.cameraCar) {
      if (this.cameraCar.hasReachedPlayer(this.player.y)) {
        tryEnd('ROADKILL');
      } else if (this.cameraCar.isPlayerTooFar(this.player.y)) {
        tryEnd('LOST_THE_SHOT');
      }
    }

    for (const entity of this.entities) {
      if (entity.dead) continue;

      if (entity instanceof Principal && entity.state !== 'ON_FIRE' && entity.state !== 'FALLEN') {
        const d = distance(px, py, entity.getCenterX(), entity.getCenterY());
        if (d < PRINCIPAL_CATCH_RADIUS * TILE_SIZE) {
          entity.catchFire();
          tryEnd('PA_ATTACK');
        }
      } else if (entity instanceof Extra && !(entity instanceof Principal) &&
                 entity.state !== 'ON_FIRE' && entity.state !== 'FALLEN') {
        const d = distance(px, py, entity.getCenterX(), entity.getCenterY());
        if (d < EXTRA_CATCH_RADIUS * TILE_SIZE) {
          if (entity.catchFire()) {
            this.player.extrasBurned++;
            this.player.resetCombo();
            this.hitStopFrames = 4;
            this.soundManager.playPanic();
            this.particles.emitBurst(entity.getCenterX(), entity.getCenterY() - 24, 3, {
              r: 255, g: 50, b: 50, vy: -60, life: 1.5, size: 3, spread: 15,
            });
          }
        }
      }
    }

    // Base drain from overtime level
    let maxDrainMult = this.overtimeLevel >= 2 ? 2.0 : this.overtimeLevel >= 1 ? 1.5 : 1.0;
    for (const entity of this.entities) {
      if (entity.dead || !(entity instanceof Torch)) continue;
      if (entity.isPlayerNearby(px, py)) {
        maxDrainMult = Math.max(maxDrainMult, TORCH_DRAIN_MULTIPLIER);
      }
    }
    this.player.drainMultiplier = maxDrainMult;

    for (const entity of this.entities) {
      if (entity.dead || !(entity instanceof PropaneCannon)) continue;
      if (entity.isPlayerInBurst(px, py)) {
        this.player.gel -= PROPANE_DRAIN_AMOUNT;
        this.player.fuel -= PROPANE_DRAIN_AMOUNT;
        this.player.gel = Math.max(0, this.player.gel);
        this.player.fuel = Math.max(0, this.player.fuel);
        this.camera.shake(4, 0.3);
        this.player.resetCombo();
        this.soundManager.playHit();
      }
    }

    if (pendingEnd) {
      this.endLevel(pendingEnd);
    }
  }

  _updateEndAnimation(dt) {
    this.input.setGameControlsVisible(false);
    this.endAnimTimer += dt;

    this.camera.update(dt);
    this.particles.update(dt);

    if (this.player.isOnFire()) {
      const intensity = this.player.getFlameIntensity();
      this.fireRenderer.update(dt, this.player.x, this.player.y + this.player.getSpriteOffsetY(), intensity);
    }

    for (const entity of this.entities) {
      if (entity.dead) continue;
      if (entity instanceof FireSafety) {
        entity.setPlayerPosition(this.player.getCenterX(), this.player.getCenterY());
        entity.update(dt);
      } else if (entity instanceof Extra || entity instanceof Principal) {
        entity.update(dt, this.tileMap);
      } else {
        entity.update(dt);
      }
    }

    this._playEndReasonAnimation(dt);

    if (this.endAnimTimer >= this.endAnimDuration) {
      if (this.player.isOnFire()) {
        this.player.extinguish();
      }

      const info = END_REASONS[this.endReason];
      this.fadeToState(info && info.isGameOver ? STATES.GAME_OVER : STATES.LEVEL_COMPLETE, () => {
        this.gameOverScreen.setup(this.endReason, this.player, this.filmCamera, this.levelConfig, this.playerName);
      });
    }
  }

  _playEndReasonAnimation(dt) {
    const px = this.player.getCenterX();
    const py = this.player.getCenterY();
    const t = this.endAnimTimer;

    switch (this.endReason) {
      case 'BURNED':
      case 'BURNED_NO_FUEL':
        if (Math.random() < 0.3) {
          this.particles.emitBurst(px + (Math.random() - 0.5) * 30, py, 1, {
            r: 80, g: 80, b: 80, life: 1.0, spread: 24, vy: -90,
          });
        }
        if (t > 0.5 && t < 0.6) this.player.extinguish();
        break;
      case 'BURNED_EXTINGUISHED':
      case 'EXTINGUISHED':
        if (Math.random() < 0.4) {
          this.particles.emitBurst(px + (Math.random() - 0.5) * 24, py - 15, 1, {
            r: 200, g: 220, b: 240, life: 0.8, spread: 15, vy: -60,
          });
        }
        break;
      case 'FELL_IN_WATER':
        if (t < 0.3 && Math.random() < 0.5) {
          this.particles.emitBurst(px, py, 2, {
            r: 100, g: 150, b: 255, life: 0.6, spread: 60,
          });
        }
        break;
      case 'ROADKILL':
        if (t < 0.3) this.camera.shake(8, 0.1);
        if (t < 0.2 && Math.random() < 0.5) {
          this.particles.emitBurst(px, py, 3, { r: 150, g: 120, b: 80, life: 0.8, spread: 90 });
        }
        break;
      case 'LOST_THE_SHOT':
        if (Math.random() < 0.2) {
          this.particles.emitBurst(px + (Math.random() - 0.5) * 60, py - 30, 1, {
            r: 50, g: 50, b: 50, life: 1.0, spread: 30,
          });
        }
        break;
      case 'CLEAN_BURN':
        if (Math.random() < 0.4) {
          this.particles.emitBurst(
            px + (Math.random() - 0.5) * 60, py + (Math.random() - 0.5) * 60,
            1, { r: 255, g: 255, b: 100, life: 0.8, spread: 45 }
          );
        }
        if (t < 0.5) this.camera.zoomTo(0.23);
        break;
      case 'SAFE_OUT':
        if (Math.random() < 0.3) {
          this.particles.emitBurst(px, py - 45, 1, {
            r: 100, g: 255, b: 100, life: 0.6, spread: 24,
          });
        }
        break;
    }
  }

  _updatePAAttack(dt) {
    if (this.paSwarm) {
      this.paSwarm.update(dt);
      this.camera.update(dt);
      if (this.paSwarm.done) {
        this.fadeToState(STATES.GAME_OVER, () => {
          this.gameOverScreen.setup('PA_ATTACK', this.player, this.filmCamera, this.levelConfig, this.playerName);
        });
      }
      if (this.paSwarm.phase === 'BEATING') {
        this.camera.shake(3, 0.1);
      }
    }
  }

  _updateGameOver(dt) {
    const result = this.gameOverScreen.update(dt, this.input);
    if (!result) return;

    if (result.action === 'NEXT_LEVEL') {
      if (this.levelManager.nextLevel()) {
        this.fadeToState(STATES.CALL_SHEET, () => {
          this.callSheet.setLevel(this.levelManager.getCurrentLevelConfig());
        });
      } else {
        this.fadeToState(STATES.MENU, () => {});
      }
    } else if (result.action === 'RETRY') {
      const checkpoint = this.levelManager.getCheckpointLevel();
      this.levelManager.setLevel(checkpoint);
      this.fadeToState(STATES.CALL_SHEET, () => {
        this.callSheet.setLevel(this.levelManager.getCurrentLevelConfig());
      });
    } else if (result.action === 'MENU') {
      this.fadeToState(STATES.MENU, () => {});
    }
  }

  _updateHighScore(dt) {
    if (this.highScoreBoard.update(dt, this.input)) {
      this.fadeToState(STATES.MENU, () => {});
    }
  }

  // --- RENDER ---

  render() {
    this.canvas.clear();
    const ctx = this.ctx;

    switch (this.state) {
      case STATES.MENU:
        this.mainMenu.render(ctx);
        break;
      case STATES.NAME_ENTRY:
        this._renderNameEntry(ctx);
        break;
      case STATES.CALL_SHEET:
        this.callSheet.render(ctx);
        break;
      case STATES.LIGHTING_UP:
        this._renderLevel(ctx);
        this._renderLightingUpOverlay(ctx);
        break;
      case STATES.COUNTDOWN:
        this._renderLevel(ctx);
        this.countdown.render(ctx);
        break;
      case STATES.PLAYING:
        this._renderLevel(ctx);
        this.hud.render(ctx, this.player, this.levelConfig, this.filmCamera, this.levelTimer);
        this._renderSurviveTimer(ctx);
        this._renderOvertimeUI(ctx);
        this.stuntCoordinator.render(ctx, this.camera);
        break;
      case STATES.END_ANIMATION:
        this._renderLevel(ctx);
        this.hud.render(ctx, this.player, this.levelConfig, this.filmCamera, this.levelTimer);
        this._renderEndAnimOverlay(ctx);
        break;
      case STATES.PA_ATTACK:
        this._renderLevel(ctx);
        if (this.paSwarm) this.paSwarm.render(ctx, this.camera);
        break;
      case STATES.LEVEL_COMPLETE:
      case STATES.GAME_OVER:
        this._renderLevel(ctx);
        this.gameOverScreen.render(ctx);
        break;
      case STATES.HIGH_SCORE:
        this.highScoreBoard.render(ctx);
        break;
      case STATES.ADMIN_PANEL:
        break;
    }

    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    }
  }

  _renderLightingUpOverlay(ctx) {
    if (!this.player) return;
    const progress = this.player.getLightUpProgress();

    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';

    let text = 'LIGHTING UP...';
    if (progress > 0.7) text = 'READY TO BURN!';
    else if (progress > 0.4) text = 'FIRE SPREADING...';

    const alpha = Math.min(1, progress * 3);
    ctx.globalAlpha = alpha;
    ctx.fillText(text, VIEWPORT_WIDTH / 2, 60);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderSurviveTimer(ctx) {
    if (this.chaseStarted) return;
    if (!this.player || !this.player.isOnFire()) return;

    const remaining = Math.max(0, Math.ceil(SURVIVE_TIME - this.surviveTimer));
    if (remaining <= 0) return;

    ctx.save();
    ctx.textAlign = 'center';

    // Warning when close to chase
    if (remaining <= 5) {
      const flash = Math.sin(this.surviveTimer * 8) > 0;
      ctx.fillStyle = flash ? '#ff4444' : '#ffaa00';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`FIRE SAFETIES IN ${remaining}s`, VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT - 30);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '14px monospace';
      ctx.fillText(`SURVIVE: ${remaining}s`, VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT - 30);
    }

    ctx.restore();
  }

  _renderOvertimeUI(ctx) {
    if (this.overtimeLevel <= 0) return;
    if (!this.player || !this.player.isOnFire()) return;

    ctx.save();
    ctx.textAlign = 'center';

    const flash = Math.sin(this.surviveTimer * 6) > 0;
    const multiplierText = this.overtimeLevel >= 2 ? '2x' : '1.5x';

    // Overtime banner at top
    const bannerAlpha = 0.7 + Math.sin(this.surviveTimer * 4) * 0.3;
    ctx.globalAlpha = bannerAlpha;

    if (this.overtimeLevel >= 2) {
      ctx.fillStyle = flash ? '#ff2222' : '#cc0000';
    } else {
      ctx.fillStyle = flash ? '#ffaa00' : '#dd8800';
    }

    ctx.font = 'bold 22px monospace';
    ctx.fillText(`OVERTIME ${multiplierText}`, VIEWPORT_WIDTH / 2, 30);

    // Sub-text
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    if (this.overtimeLevel >= 2) {
      ctx.fillText('PRODUCERS ON SET!', VIEWPORT_WIDTH / 2, 48);
    } else {
      ctx.fillText('RESOURCES DRAINING FASTER', VIEWPORT_WIDTH / 2, 48);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderEndAnimOverlay(ctx) {
    if (!this.endReason) return;

    const animConfig = END_ANIMS[this.endReason] || { label: '' };
    const t = this.endAnimTimer;

    let textAlpha = Math.min(1, t * 3);
    if (t > this.endAnimDuration - 0.3) {
      textAlpha = (this.endAnimDuration - t) / 0.3;
    }

    ctx.save();
    ctx.globalAlpha = textAlpha;

    const info = END_REASONS[this.endReason];
    const isWin = info && !info.isGameOver;

    ctx.fillStyle = isWin ? '#ffdd00' : '#ff4444';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';

    const bounce = t < 0.3 ? Math.sin(t * 20) * 6 : 0;
    ctx.fillText(animConfig.label, VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 - 40 + bounce);

    if (isWin) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.fillText('GREAT WORK!', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 - 10);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderNameEntry(ctx) {
    ctx.fillStyle = '#110800';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const cx = VIEWPORT_WIDTH / 2;

    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER YOUR NAME', cx, 140);

    ctx.textAlign = 'left';
  }

  _renderLevel(ctx) {
    if (!this.tileMap) return;

    this.tileMap.render(ctx, this.camera);
    this.trailRenderer.render(ctx, this.camera);

    const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);
    for (const entity of sortedEntities) {
      if (!entity.dead) {
        entity.render(ctx, this.camera);
      }
    }

    if (this.player) {
      this.player.render(ctx, this.camera);
      if (this.player.isOnFire() || this.player.isLightingUp()) {
        this.fireRenderer.render(ctx, this.camera);
      }
    }

    this.particles.render(ctx, this.camera);

    if (this.player) {
      this.ambientLight.render(
        ctx, this.camera,
        this.player.getCenterX(), this.player.getCenterY(),
        this.player.fuel
      );
    }
  }
}
