import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CAMERA_LERP_SPEED } from '../constants.js';
import { lerp } from '../utils/math.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 1.0;
    this.targetZoom = 1.0;

    // Shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Map bounds
    this.mapWidth = 0;
    this.mapHeight = 0;
  }

  setMapBounds(widthPx, heightPx) {
    this.mapWidth = widthPx;
    this.mapHeight = heightPx;
  }

  follow(entity) {
    this.targetX = entity.getCenterX() - VIEWPORT_WIDTH / (2 * this.zoom);
    this.targetY = entity.getCenterY() - VIEWPORT_HEIGHT / (2 * this.zoom);
  }

  update(dt) {
    this.x = lerp(this.x, this.targetX, CAMERA_LERP_SPEED);
    this.y = lerp(this.y, this.targetY, CAMERA_LERP_SPEED);

    // Clamp to map bounds
    if (this.mapWidth > 0) {
      const vw = VIEWPORT_WIDTH / this.zoom;
      const vh = VIEWPORT_HEIGHT / this.zoom;
      if (this.x < 0) this.x = 0;
      if (this.y < 0) this.y = 0;
      if (this.x + vw > this.mapWidth) this.x = Math.max(0, this.mapWidth - vw);
      if (this.y + vh > this.mapHeight) this.y = Math.max(0, this.mapHeight - vh);
    }

    // Zoom lerp
    this.zoom = lerp(this.zoom, this.targetZoom, 0.05);

    // Shake update
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  zoomTo(level, duration) {
    this.targetZoom = level;
    // Zoom lerps automatically in update
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom + this.shakeOffsetX,
      y: (worldY - this.y) * this.zoom + this.shakeOffsetY,
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.shakeOffsetX) / this.zoom + this.x,
      y: (screenY - this.shakeOffsetY) / this.zoom + this.y,
    };
  }

  getViewBounds() {
    const vw = VIEWPORT_WIDTH / this.zoom;
    const vh = VIEWPORT_HEIGHT / this.zoom;
    return {
      left: this.x,
      top: this.y,
      right: this.x + vw,
      bottom: this.y + vh,
      width: vw,
      height: vh,
    };
  }
}
