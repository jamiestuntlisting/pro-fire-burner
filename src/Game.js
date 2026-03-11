import { TICK_RATE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, TILE_SIZE,
  EXTRA_CATCH_RADIUS, PRINCIPAL_CATCH_RADIUS, PROPANE_DRAIN_AMOUNT,
  TORCH_DRAIN_MULTIPLIER, END_REASONS } from './constants.js';
import { Canvas } from './engine/Canvas.js';
import { InputManager } from './engine/InputManager.js';
import { Camera } from './engine/Camera.js';
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
import { CountdownTimer } from './utils/timer.js';
import { distance } from './utils/math.js';
import { addHighScore } from './utils/storage.js';

const STATES = {
  MENU: 'MENU',
  CALL_SHEET: 'CALL_SHEET',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PA_ATTACK: 'PA_ATTACK',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER',
  HIGH_SCORE: 'HIGH_SCORE',
  ADMIN_PANEL: 'ADMIN_PANEL',
};

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

    // Rendering systems
    this.fireRenderer = new FireRenderer();
    this.trailRenderer = new TrailRenderer();
    this.ambientLight = new AmbientLight();
    this.hud = new HUD();

    // UI screens
    this.mainMenu = new MainMenu();
    this.callSheet = new CallSheet();
    this.countdown = new Countdown();
    this.gameOverScreen = new GameOverScreen();
    this.highScoreBoard = new HighScoreBoard();

    // Game state
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

    // Fade transition
    this.fadeAlpha = 0;
    this.fadeDirection = 0; // 0=none, 1=fading out, -1=fading in
    this.fadeCallback = null;

    // Hit-stop
    this.hitStopFrames = 0;

    // Game loop
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
  }

  async init() {
    await this.levelManager.loadLevels();
    this.soundManager.init();

    // Key listener for konami code
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

  // --- STATE TRANSITIONS ---

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
    this.camera.targetZoom = 1.0;
    this.camera.zoom = 1.0;
    this.ambientLight.setTimeOfDay(this.levelConfig.timeOfDay);

    this.fireRenderer.clear();
    this.trailRenderer.clear();
    this.particles.clear();

    // Find film camera
    this.filmCamera = this.entities.find(e => e instanceof FilmCamera) || null;

    // Level timer for MARK levels
    if (this.levelConfig.timeLimit > 0) {
      this.levelTimer = new CountdownTimer(this.levelConfig.timeLimit);
    } else {
      this.levelTimer = null;
    }
  }

  endLevel(reason) {
    if (this.endReason) return; // Already ending
    this.endReason = reason;

    if (reason === 'PA_ATTACK') {
      this.paSwarm = new PASwarm();
      this.paSwarm.activate(this.player.getCenterX(), this.player.getCenterY(), this.camera);
      this.state = STATES.PA_ATTACK;
      this.camera.shake(6, 0.5);
      return;
    }

    this.player.extinguish();
    const info = END_REASONS[reason];

    if (reason === 'SPLASHDOWN') {
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 30, {
        r: 100, g: 150, b: 255, life: 1.0, spread: 50,
      });
      this.soundManager.playSplash();
    } else if (reason === 'EXTINGUISHED' || reason === 'SAFE_OUT') {
      this.soundManager.playExtinguish();
    } else if (reason === 'CLEAN_BURN') {
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 20, {
        r: 255, g: 255, b: 100, life: 1.5, spread: 30,
      });
    }

    if (info && info.isGameOver) {
      this.soundManager.playGameOver();
      this.camera.shake(3, 0.3);
    }

    this.fadeToState(info && info.isGameOver ? STATES.GAME_OVER : STATES.LEVEL_COMPLETE, () => {
      this.gameOverScreen.setup(reason, this.player, this.filmCamera, this.levelConfig);
    });
  }

  // --- UPDATE ---

  update(dt) {
    // Fade transition
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
      case STATES.MENU:
        this._updateMenu(dt);
        break;
      case STATES.CALL_SHEET:
        this._updateCallSheet(dt);
        break;
      case STATES.COUNTDOWN:
        this._updateCountdown(dt);
        break;
      case STATES.PLAYING:
        this._updatePlaying(dt);
        break;
      case STATES.PA_ATTACK:
        this._updatePAAttack(dt);
        break;
      case STATES.LEVEL_COMPLETE:
      case STATES.GAME_OVER:
        this._updateGameOver(dt);
        break;
      case STATES.HIGH_SCORE:
        this._updateHighScore(dt);
        break;
    }
  }

  _updateMenu(dt) {
    const choice = this.mainMenu.update(dt, this.input);
    if (choice === 'NEW GAME') {
      this.levelManager.setLevel(0);
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
      this.fadeToState(STATES.COUNTDOWN, () => {
        this.startLevel();
        this.countdown.reset(this.soundManager);
      });
    }
  }

  _updateCountdown(dt) {
    if (this.countdown.update(dt)) {
      this.state = STATES.PLAYING;
      this.player.ignite();
      if (this.levelTimer) this.levelTimer.start();
      if (this.cameraCar) this.cameraCar.activate();

      // Ignition burst
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 40, {
        r: 255, g: 150, b: 0, life: 0.8, spread: 60,
      });
      this.soundManager.playIgnition();

      // Brief zoom
      this.camera.zoomTo(1.05);
      setTimeout(() => this.camera.zoomTo(1.0), 300);
    }
    this.camera.follow(this.player);
    this.camera.update(dt);
  }

  _updatePlaying(dt) {
    // Update tilemap
    this.tileMap.update(dt);

    // Update player
    this.player.update(dt, this.input, this.collisionSystem);

    // Update camera
    this.camera.follow(this.player);
    this.camera.update(dt);

    // Rebuild spatial hash
    this.spatialHash.rebuild(this.entities);

    // Update entities
    for (const entity of this.entities) {
      if (entity.dead) continue;

      if (entity instanceof Extra || entity instanceof Principal) {
        entity.update(dt, this.tileMap);
      } else if (entity instanceof FilmCamera) {
        entity.update(dt);
      } else {
        entity.update(dt);
      }
    }

    // Camera car
    if (this.cameraCar && this.cameraCar.active) {
      this.cameraCar.update(dt, this.player.y);
    }

    // Level timer
    if (this.levelTimer) {
      this.levelTimer.update(dt);
      if (this.levelTimer.isExpired()) {
        this.endLevel('BURNED');
        return;
      }
    }

    // --- Collision checks ---
    if (this.player.isOnFire()) {
      this._checkPlayingCollisions(dt);
    }

    // Lay down mechanic
    if (this.input.actionJustPressed && this.player.isOnFire()) {
      if (this.player.layDown()) {
        // Find nearest fire safety to come help
        const safeties = this.entities.filter(e => e instanceof FireSafety && !e.dead);
        if (safeties.length > 0) {
          let nearest = null;
          let nearestDist = Infinity;
          for (const s of safeties) {
            const d = distance(this.player.getCenterX(), this.player.getCenterY(), s.getCenterX(), s.getCenterY());
            if (d < nearestDist) {
              nearestDist = d;
              nearest = s;
            }
          }
          if (nearest) {
            nearest.moveToward(this.player.getCenterX(), this.player.getCenterY());
          }
        }
      }
    }

    // Lay down timer - check for fire safety arrival
    if (this.player.isLayingDown()) {
      const safeties = this.entities.filter(e => e instanceof FireSafety && !e.dead);
      for (const s of safeties) {
        if (s.arriving) {
          this.endLevel('SAFE_OUT');
          return;
        }
      }
      // If no safeties or after 3 seconds, just get up
      if (this.player.layDownTimer > 3.0) {
        this.player.fireState = FIRE_STATE.ON_FIRE;
        this.player.inputLocked = false;
      }
    }

    // Fire rendering
    const intensity = this.player.getFlameIntensity();
    this.fireRenderer.update(dt, this.player.x, this.player.y, intensity);
    this.trailRenderer.update(dt, this.player.x, this.player.y, this.player.isMoving, intensity);
    this.particles.update(dt);

    // Check end conditions
    if (this.player.gel <= 0) {
      this.endLevel('BURNED');
    } else if (this.player.fuel <= 0) {
      this.endLevel('CLEAN_BURN');
    }

    // Water check
    if (this.collisionSystem.isOnWater(this.player) && this.player.isOnFire()) {
      this.endLevel('SPLASHDOWN');
    }

    // Remove dead entities
    this.entities = this.entities.filter(e => !e.dead);
  }

  _checkPlayingCollisions(dt) {
    const px = this.player.getCenterX();
    const py = this.player.getCenterY();

    // Pending end reasons (for same-tick priority)
    let pendingEnd = null;
    let pendingPriority = 99;

    const tryEnd = (reason) => {
      const p = END_REASONS[reason].priority;
      if (p < pendingPriority) {
        pendingPriority = p;
        pendingEnd = reason;
      }
    };

    // Fire safeties - spray cone check
    for (const entity of this.entities) {
      if (entity.dead) continue;

      if (entity instanceof FireSafety) {
        if (entity.isPlayerInSpray(px, py)) {
          tryEnd('EXTINGUISHED');
        }
      }
    }

    // Film camera FOV
    if (this.filmCamera) {
      const lostShot = this.filmCamera.updatePlayerTracking(px, py, dt);
      if (lostShot) {
        tryEnd('LOST_THE_SHOT');
        this.player.timesFOVLeft++;
      }
    }

    // Camera car
    if (this.cameraCar) {
      if (this.cameraCar.hasReachedPlayer(this.player.y)) {
        tryEnd('ROADKILL');
      } else if (this.cameraCar.isPlayerTooFar(this.player.y)) {
        tryEnd('LOST_THE_SHOT');
      }
    }

    // Extras and Principals
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
            // Floating text particle
            this.particles.emitBurst(entity.getCenterX(), entity.getCenterY() - 8, 3, {
              r: 255, g: 50, b: 50, vy: -20, life: 1.5, size: 1, spread: 5,
            });
          }
        }
      }
    }

    // Torches - proximity drain
    let maxDrainMult = 1.0;
    for (const entity of this.entities) {
      if (entity.dead || !(entity instanceof Torch)) continue;
      if (entity.isPlayerNearby(px, py)) {
        maxDrainMult = Math.max(maxDrainMult, TORCH_DRAIN_MULTIPLIER);
      }
    }
    this.player.drainMultiplier = maxDrainMult;

    // Propane cannons
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

    // Pickups
    for (const entity of this.entities) {
      if (entity.dead || !(entity instanceof Pickup)) continue;
      if (this.collisionSystem.entitiesOverlap(this.player, entity)) {
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

    // Resolve pending end
    if (pendingEnd) {
      this.endLevel(pendingEnd);
    }
  }

  _updatePAAttack(dt) {
    if (this.paSwarm) {
      this.paSwarm.update(dt);
      this.camera.update(dt);
      if (this.paSwarm.done) {
        this.fadeToState(STATES.GAME_OVER, () => {
          this.gameOverScreen.setup('PA_ATTACK', this.player, this.filmCamera, this.levelConfig);
        });
      }
      // Ongoing shake during beating
      if (this.paSwarm.phase === 'BEATING') {
        this.camera.shake(3, 0.1);
      }
    }
  }

  _updateGameOver(dt) {
    const result = this.gameOverScreen.update(dt, this.input);
    if (!result) return;

    if (result.action === 'SAVE_SCORE') {
      addHighScore({
        playerName: result.name,
        totalScore: result.score,
        highestLevel: this.levelConfig.id,
        date: new Date().toISOString(),
      });
    } else if (result.action === 'NEXT_LEVEL') {
      if (this.levelManager.nextLevel()) {
        this.fadeToState(STATES.CALL_SHEET, () => {
          this.callSheet.setLevel(this.levelManager.getCurrentLevelConfig());
        });
      } else {
        // Beat all levels!
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
      case STATES.CALL_SHEET:
        this.callSheet.render(ctx);
        break;
      case STATES.COUNTDOWN:
        this._renderLevel(ctx);
        this.countdown.render(ctx);
        break;
      case STATES.PLAYING:
        this._renderLevel(ctx);
        this.hud.render(ctx, this.player, this.levelConfig, this.filmCamera, this.levelTimer);
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
        // Admin panel is DOM-based
        break;
    }

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    }
  }

  _renderLevel(ctx) {
    if (!this.tileMap) return;

    // Tile map
    this.tileMap.render(ctx, this.camera);

    // Trail (behind entities)
    this.trailRenderer.render(ctx, this.camera);

    // Entities (sorted by Y for depth)
    const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);
    for (const entity of sortedEntities) {
      if (!entity.dead) {
        entity.render(ctx, this.camera);
      }
    }

    // Player
    if (this.player) {
      this.player.render(ctx, this.camera);

      // Fire on player
      if (this.player.isOnFire()) {
        this.fireRenderer.render(ctx, this.camera);
      }
    }

    // Particles
    this.particles.render(ctx, this.camera);

    // Ambient lighting (night/twilight)
    if (this.player) {
      this.ambientLight.render(
        ctx, this.camera,
        this.player.getCenterX(), this.player.getCenterY(),
        this.player.fuel
      );
    }
  }
}
