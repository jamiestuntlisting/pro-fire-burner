export class GameTimer {
  constructor() {
    this.elapsed = 0;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  reset() {
    this.elapsed = 0;
    this.running = false;
  }

  update(dt) {
    if (this.running) {
      this.elapsed += dt;
    }
  }

  getSeconds() {
    return this.elapsed;
  }
}

export class CountdownTimer {
  constructor(duration) {
    this.duration = duration;
    this.remaining = duration;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  reset() {
    this.remaining = this.duration;
    this.running = false;
  }

  update(dt) {
    if (this.running) {
      this.remaining = Math.max(0, this.remaining - dt);
    }
  }

  isExpired() {
    return this.remaining <= 0;
  }
}
