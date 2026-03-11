import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export class Canvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = VIEWPORT_WIDTH;
    this.canvas.height = VIEWPORT_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;
    this.scale = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const aspect = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
    let w, h;
    if (windowW / windowH > aspect) {
      h = windowH;
      w = h * aspect;
    } else {
      w = windowW;
      h = w / aspect;
    }
    this.scale = w / VIEWPORT_WIDTH;
    this.canvas.style.width = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  }

  getContext() {
    return this.ctx;
  }

  getScreenPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale,
    };
  }
}
