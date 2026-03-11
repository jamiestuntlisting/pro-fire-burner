import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, FUEL_MAX } from '../constants.js';

export class AmbientLight {
  constructor() {
    this.enabled = false;
    this.darkness = 0.7;
  }

  setTimeOfDay(timeOfDay) {
    switch (timeOfDay) {
      case 'night':
        this.enabled = true;
        this.darkness = 0.6;
        break;
      case 'twilight':
        this.enabled = true;
        this.darkness = 0.3;
        break;
      default:
        this.enabled = false;
        break;
    }
  }

  render(ctx, camera, playerX, playerY, fuelLevel) {
    if (!this.enabled) return;

    const screen = camera.worldToScreen(playerX, playerY);

    // Much larger light radius - fire lights up a big area
    const baseRadius = 120;
    const maxRadius = 350;
    const fuelRatio = fuelLevel / FUEL_MAX;
    const radius = baseRadius + (maxRadius - baseRadius) * fuelRatio;

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    const gradient = ctx.createRadialGradient(
      screen.x, screen.y, 0,
      screen.x, screen.y, radius
    );

    // Inner area is bright warm light from the fire
    const innerLight = Math.floor(255 * (1 - this.darkness * 0.15));
    gradient.addColorStop(0, `rgb(${innerLight},${Math.floor(innerLight * 0.92)},${Math.floor(innerLight * 0.7)})`);
    gradient.addColorStop(0.3, `rgb(${Math.floor(innerLight * 0.85)},${Math.floor(innerLight * 0.75)},${Math.floor(innerLight * 0.5)})`);
    gradient.addColorStop(0.6, `rgb(${Math.floor(innerLight * 0.5)},${Math.floor(innerLight * 0.4)},${Math.floor(innerLight * 0.25)})`);

    const outerDark = Math.floor(255 * (1 - this.darkness));
    gradient.addColorStop(1, `rgb(${outerDark},${outerDark},${Math.floor(outerDark * 0.9)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    ctx.restore();
  }
}
