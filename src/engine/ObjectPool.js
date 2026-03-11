export class ObjectPool {
  constructor(factory, initialSize = 100) {
    this.factory = factory;
    this.pool = [];
    this.active = [];

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.factory();
    }
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      this.pool.push(this.active.pop());
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (obj.update) obj.update(dt);
      if (obj.dead || obj.life <= 0) {
        this.active.splice(i, 1);
        if (obj.reset) obj.reset();
        this.pool.push(obj);
      }
    }
  }

  render(ctx, camera) {
    for (const obj of this.active) {
      if (obj.render) obj.render(ctx, camera);
    }
  }

  get activeCount() {
    return this.active.length;
  }
}
