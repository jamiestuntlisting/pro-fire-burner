import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, FUEL_MAX } from '../constants.js';

export class AmbientLight {
  constructor() {
    this.enabled = false;
    this.darkness = 0.7; // 0 = full light, 1 = complete dark
  }

  setTimeOfDay(timeOfDay) {
    switch (timeOfDay) {
      case 'night':
        this.enabled = true;
        this.darkness = 0.75;
        break;
      case 'twilight':
        this.enabled = true;
        this.darkness = 0.45;
        break;
      default:
        this.enabled = false;
        break;
    }
  }

  render(ctx, camera, playerX, playerY, fuelLevel) {
    if (!this.enabled) return;

    const screen = camera.worldToScreen(playerX, playerY);

    // Light radius scales with fuel
    const baseRadius = 40;
    const maxRadius = 120;
    const fuelRatio = fuelLevel / FUEL_MAX;
    const radius = baseRadius + (maxRadius - baseRadius) * fuelRatio;

    // Create radial gradient centered on player
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    const gradient = ctx.createRadialGradient(
      screen.x, screen.y, 0,
      screen.x, screen.y, radius
    );

    const innerLight = Math.floor(255 * (1 - this.darkness * 0.3));
    gradient.addColorStop(0, `rgb(${innerLight},${Math.floor(innerLight * 0.9)},${Math.floor(innerLight * 0.7)})`);
    gradient.addColorStop(0.6, `rgb(${Math.floor(innerLight * 0.5)},${Math.floor(innerLight * 0.4)},${Math.floor(innerLight * 0.3)})`);

    const outerDark = Math.floor(255 * (1 - this.darkness));
    gradient.addColorStop(1, `rgb(${outerDark},${outerDark},${Math.floor(outerDark * 0.9)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    ctx.restore();
  }
}
