import { Extra } from './Extra.js';
import { PRINCIPAL_CATCH_RADIUS } from '../constants.js';

export class Principal extends Extra {
  constructor(x, y) {
    super(x, y);
    this.isPrincipal = true;
    this.starBob = 0;
  }

  update(dt, tileMap) {
    super.update(dt, tileMap);
    this.starBob += dt * 3;
  }

  render(ctx, camera) {
    super.render(ctx, camera);

    if (this.state === 'FALLEN') return;

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Star icon above head
    const bobOffset = Math.sin(this.starBob) * 2;
    const starY = sy - 8 + bobOffset;
    ctx.fillStyle = '#ffdd00';
    // Simple star shape using pixels
    ctx.fillRect(sx + 4, starY, 4, 1);
    ctx.fillRect(sx + 3, starY + 1, 6, 1);
    ctx.fillRect(sx + 2, starY + 2, 8, 1);
    ctx.fillRect(sx + 4, starY + 3, 4, 1);
    ctx.fillRect(sx + 3, starY + 4, 2, 1);
    ctx.fillRect(sx + 7, starY + 4, 2, 1);
  }
}
