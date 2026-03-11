import { Extra } from './Extra.js';
import { PRINCIPAL_CATCH_RADIUS } from '../constants.js';

export class Principal extends Extra {
  constructor(x, y) {
    super(x, y);
    this.isPrincipal = true;
    this.starBob = 0;
    this.starSpin = 0;
  }

  update(dt, tileMap) {
    super.update(dt, tileMap);
    this.starBob += dt * 3;
    this.starSpin += dt * 2;
  }

  render(ctx, camera) {
    super.render(ctx, camera);

    if (this.state === 'FALLEN') return;

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    const bobOffset = Math.sin(this.starBob) * 4;
    const starCx = sx + 10;
    const starCy = sy - 16 + bobOffset;

    ctx.save();

    // Star glow
    ctx.fillStyle = 'rgba(255,220,0,0.3)';
    ctx.beginPath();
    ctx.arc(starCx, starCy, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw a proper 5-pointed star
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    const outerR = 12;
    const innerR = 5.4;
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI / 5) - Math.PI / 2 + this.starSpin * 0.3;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = starCx + Math.cos(angle) * r;
      const py = starCy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,200,0.5)';
    ctx.beginPath();
    ctx.arc(starCx, starCy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
