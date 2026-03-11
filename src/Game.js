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
import { CountdownTimer } from './utils/timer.js';
import { distance } from './utils/math.js';

const STATES = {
  MENU: 'MENU',
  NAME_ENTRY: 'NAME_ENTRY',
  CALL_SHEET: 'CALL_SHEET',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  END_ANIMATION: 'END_ANIMATION',
  PA_ATTACK: 'PA_ATTACK',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER',
  HIGH_SCORE: 'HIGH_SCORE',
  ADMIN_PANEL: 'ADMIN_PANEL',
};

// End animation configs per reason
const END_ANIMS = {
  BURNED: { duration: 1.5, label: 'BURNED UP!' },
  EXTINGUISHED: { duration: 1.5, label: 'PUT OUT!' },
  SPLASHDOWN: { duration: 1.5, label: 'SPLASHDOWN!' },
  ROADKILL: { duration: 1.2, label: 'ROADKILL!' },
  LOST_THE_SHOT: { duration: 1.2, label: 'LOST THE SHOT!' },
  CLEAN_BURN: { duration: 2.0, label: 'CLEAN BURN!' },
  SAFE_OUT: { duration: 1.5, label: 'SAFE OUT!' },
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

    // Stunt coordinator
    this.stuntCoordinator = new StuntCoordinator();

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

    // End animation state
    this.endAnimTimer = 0;
    this.endAnimDuration = 1.5;

    // Fade transition
    this.fadeAlpha = 0;
    this.fadeDirection = 0;
    this.fadeCallback = null;

    // Hit-stop
    this.hitStopFrames = 0;

    // Game loop
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;

    // Player name (entered at start)
    this.playerName = '';
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

    // Set camera mode
    if (this.levelConfig.cameraMode === 'STATIC_PAN') {
      const mapCenterX = (this.levelConfig.mapWidth * TILE_SIZE) / 2;
      const mapCenterY = (this.levelConfig.mapHeight * TILE_SIZE) / 2;
      const panRange = Math.min(this.levelConfig.mapWidth, this.levelConfig.mapHeight) * TILE_SIZE * 0.15;
      this.camera.setStaticPan(mapCenterX, mapCenterY, panRange, panRange * 0.5, 0.25);
    } else {
      this.camera.setFollowMode();
    }

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

    // Don't extinguish or cut away yet - play end animation first
    const animConfig = END_ANIMS[reason] || { duration: 1.5, label: reason };
    this.endAnimTimer = 0;
    this.endAnimDuration = animConfig.duration;
    this.state = STATES.END_ANIMATION;

    // Play sounds immediately
    if (reason === 'SPLASHDOWN') {
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 30, {
        r: 100, g: 150, b: 255, life: 1.0, spread: 50,
      });
      this.soundManager.playSplash();
    } else if (reason === 'CLEAN_BURN') {
      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 20, {
        r: 255, g: 255, b: 100, life: 1.5, spread: 30,
      });
    }

    const info = END_REASONS[reason];
    if (info && info.isGameOver) {
      this.soundManager.playGameOver();
      this.camera.shake(3, 0.3);
    }

    // Extinguish player visually for relevant reasons
    if (reason === 'EXTINGUISHED' || reason === 'SPLASHDOWN' || reason === 'SAFE_OUT') {
      this.player.extinguish();
      this.soundManager.playExtinguish();
    }
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
      case STATES.NAME_ENTRY:
        this._updateNameEntry(dt);
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
      case STATES.END_ANIMATION:
        this._updateEndAnimation(dt);
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
      this.playerName = '';
      this._nameEntryKeys = {};
      this._nameBackspaceHeld = false;
      this.fadeToState(STATES.NAME_ENTRY, () => {});
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
    // Listen for key presses for name
    for (const [code, pressed] of Object.entries(this.input.keys)) {
      if (pressed && code.startsWith('Key') && this.playerName.length < 10) {
        const letter = code.replace('Key', '');
        if (!this._nameEntryKeys[code]) {
          this.playerName += letter;
        }
        this._nameEntryKeys[code] = true;
      } else if (!pressed) {
        this._nameEntryKeys[code] = false;
      }
    }
    if (this.input.keys['Backspace']) {
      if (!this._nameBackspaceHeld) {
        this.playerName = this.playerName.slice(0, -1);
        this._nameBackspaceHeld = true;
      }
    } else {
      this._nameBackspaceHeld = false;
    }
    if (this.input.enterJustPressed && this.playerName.length > 0) {
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

      this.particles.emitBurst(this.player.getCenterX(), this.player.getCenterY(), 40, {
        r: 255, g: 150, b: 0, life: 0.8, spread: 60,
      });
      this.soundManager.playIgnition();

      this.camera.zoomTo(1.05);
      setTimeout(() => this.camera.zoomTo(1.0), 300);
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

    for (const entity of this.entities) {
      if (entity.dead) continue;

      if (entity instanceof FireSafety) {
        entity.setPlayerPosition(px, py);
        entity.update(dt);
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

    if (this.player.isOnFire()) {
      this._checkPlayingCollisions(dt);
    }

    // Lay down mechanic
    if (this.input.actionJustPressed && this.player.isOnFire()) {
      if (this.player.layDown()) {
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

    if (this.player.isLayingDown()) {
      const safeties = this.entities.filter(e => e instanceof FireSafety && !e.dead);
      for (const s of safeties) {
        if (s.arriving) {
          this.endLevel('SAFE_OUT');
          return;
        }
      }
      if (this.player.layDownTimer > 3.0) {
        this.player.fireState = FIRE_STATE.ON_FIRE;
        this.player.inputLocked = false;
      }
    }

    const intensity = this.player.getFlameIntensity();
    this.fireRenderer.update(dt, this.player.x, this.player.y, intensity);
    this.trailRenderer.update(dt, this.player.x, this.player.y, this.player.isMoving, intensity);
    this.particles.update(dt);

    this.stuntCoordinator.update(dt, this.player.isMoving);

    if (this.player.gel <= 0) {
      this.endLevel('BURNED');
    } else if (this.player.fuel <= 0) {
      this.endLevel('CLEAN_BURN');
    }

    if (this.collisionSystem.isOnWater(this.player) && this.player.isOnFire()) {
      this.endLevel('SPLASHDOWN');
    }

    this.entities = this.entities.filter(e => !e.dead);
  }

  _checkPlayingCollisions(dt) {
    const px = this.player.getCenterX();
    const py = this.player.getCenterY();

    let pendingEnd = null;
    let pendingPriority = 99;

    const tryEnd = (reason) => {
      const p = END_REASONS[reason].priority;
      if (p < pendingPriority) {
        pendingPriority = p;
        pendingEnd = reason;
      }
    };

    // Fire safeties - spray accelerates fuel loss instead of instant extinguish
    for (const entity of this.entities) {
      if (entity.dead) continue;

      if (entity instanceof FireSafety) {
        if (entity.isPlayerInSpray(px, py)) {
          // Accelerate fuel drain instead of instant kill
          this.player.fuel -= entity.fuelDrainRate * dt;
          this.player.fuel = Math.max(0, this.player.fuel);
          // Also drain some gel
          this.player.gel -= entity.fuelDrainRate * 0.3 * dt;
          this.player.gel = Math.max(0, this.player.gel);
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
            this.particles.emitBurst(entity.getCenterX(), entity.getCenterY() - 8, 3, {
              r: 255, g: 50, b: 50, vy: -20, life: 1.5, size: 1, spread: 5,
            });
          }
        }
      }
    }

    // Torches
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

    if (pendingEnd) {
      this.endLevel(pendingEnd);
    }
  }

  _updateEndAnimation(dt) {
    this.endAnimTimer += dt;

    // Keep updating rendering during end animation
    this.camera.update(dt);
    this.particles.update(dt);

    // Keep fire rendering going for burn-related ends
    if (this.player.isOnFire()) {
      const intensity = this.player.getFlameIntensity();
      this.fireRenderer.update(dt, this.player.x, this.player.y, intensity);
    }

    // Keep entities moving during end animation
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

    // Reason-specific animations during the delay
    this._playEndReasonAnimation(dt);

    // After animation completes, transition
    if (this.endAnimTimer >= this.endAnimDuration) {
      // Now extinguish if we haven't already
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
        // Char/smoke particles rising
        if (Math.random() < 0.3) {
          this.particles.emitBurst(px + (Math.random() - 0.5) * 10, py, 1, {
            r: 80, g: 80, b: 80, life: 1.0, spread: 8, vy: -30,
          });
        }
        if (t > 0.5 && t < 0.6) {
          this.player.extinguish();
        }
        break;

      case 'EXTINGUISHED':
        // Steam/fog rising from player
        if (Math.random() < 0.4) {
          this.particles.emitBurst(px + (Math.random() - 0.5) * 8, py - 5, 1, {
            r: 200, g: 220, b: 240, life: 0.8, spread: 5, vy: -20,
          });
        }
        break;

      case 'SPLASHDOWN':
        // Water ripple bursts
        if (t < 0.3 && Math.random() < 0.5) {
          this.particles.emitBurst(px, py, 2, {
            r: 100, g: 150, b: 255, life: 0.6, spread: 20,
          });
        }
        break;

      case 'ROADKILL':
        // Impact shake
        if (t < 0.3) {
          this.camera.shake(5, 0.1);
        }
        // Debris
        if (t < 0.2 && Math.random() < 0.5) {
          this.particles.emitBurst(px, py, 3, {
            r: 150, g: 120, b: 80, life: 0.8, spread: 30,
          });
        }
        break;

      case 'LOST_THE_SHOT':
        // Film strip particles
        if (Math.random() < 0.2) {
          this.particles.emitBurst(px + (Math.random() - 0.5) * 20, py - 10, 1, {
            r: 50, g: 50, b: 50, life: 1.0, spread: 10,
          });
        }
        break;

      case 'CLEAN_BURN':
        // Victory sparkles
        if (Math.random() < 0.4) {
          this.particles.emitBurst(
            px + (Math.random() - 0.5) * 20,
            py + (Math.random() - 0.5) * 20,
            1, {
              r: 255, g: 255, b: 100, life: 0.8, spread: 15,
            }
          );
        }
        // Slow zoom out
        if (t < 0.5) {
          this.camera.zoomTo(0.95);
        }
        break;

      case 'SAFE_OUT':
        // Thumbs up sparkle
        if (Math.random() < 0.3) {
          this.particles.emitBurst(px, py - 15, 1, {
            r: 100, g: 255, b: 100, life: 0.6, spread: 8,
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
      case STATES.COUNTDOWN:
        this._renderLevel(ctx);
        this.countdown.render(ctx);
        break;
      case STATES.PLAYING:
        this._renderLevel(ctx);
        this.hud.render(ctx, this.player, this.levelConfig, this.filmCamera, this.levelTimer);
        this.stuntCoordinator.render(ctx);
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

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    }
  }

  _renderEndAnimOverlay(ctx) {
    if (!this.endReason) return;

    const animConfig = END_ANIMS[this.endReason] || { label: '' };
    const t = this.endAnimTimer;

    // Fade in the label text
    let textAlpha = Math.min(1, t * 3);
    if (t > this.endAnimDuration - 0.3) {
      textAlpha = (this.endAnimDuration - t) / 0.3;
    }

    ctx.save();
    ctx.globalAlpha = textAlpha;

    // Big centered text
    const info = END_REASONS[this.endReason];
    const isWin = info && !info.isGameOver;

    ctx.fillStyle = isWin ? '#ffdd00' : '#ff4444';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';

    // Slight bounce animation
    const bounce = t < 0.3 ? Math.sin(t * 20) * 3 : 0;
    ctx.fillText(animConfig.label, VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 - 20 + bounce);

    // Subtitle
    if (isWin) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.fillText('GREAT WORK!', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 - 5);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderNameEntry(ctx) {
    ctx.fillStyle = '#110800';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const cx = VIEWPORT_WIDTH / 2;

    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER YOUR NAME', cx, 70);

    ctx.fillStyle = '#aa7744';
    ctx.font = '7px monospace';
    ctx.fillText('This will appear on the high score board', cx, 90);

    // Name display box
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(cx - 70, 110, 140, 24);
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 70, 110, 140, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    const cursor = Math.sin(Date.now() / 300) > 0 ? '_' : '';
    ctx.fillText(this.playerName + cursor, cx, 127);

    // Hint
    if (this.playerName.length > 0) {
      const blink = Math.sin(Date.now() / 400) > 0;
      if (blink) {
        ctx.fillStyle = '#44ff44';
        ctx.font = '7px monospace';
        ctx.fillText('PRESS ENTER TO START', cx, 155);
      }
    }

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
      if (this.player.isOnFire()) {
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
