import { JOYSTICK_DEADZONE } from '../constants.js';
import { snap8Dir } from '../utils/math.js';

export class InputManager {
  constructor(canvas) {
    this.keys = {};
    this.direction = { x: 0, y: 0 };
    this.actionPressed = false;
    this.actionJustPressed = false;
    this.enterPressed = false;
    this.enterJustPressed = false;
    this._prevAction = false;
    this._prevEnter = false;
    this.isTouchDevice = false;

    // Joystick state
    this.joystickActive = false;
    this.joystickStart = { x: 0, y: 0 };
    this.joystickCurrent = { x: 0, y: 0 };
    this.joystickDir = { x: 0, y: 0 };

    this._canvas = canvas;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this._setupTouch();
  }

  _setupTouch() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const actionBtn = document.getElementById('action-btn');
    const enterBtn = document.getElementById('enter-btn');
    const touchControls = document.getElementById('touch-controls');
    if (!joystickZone || !actionBtn) return;

    // Auto-detect touch device
    const showTouch = () => {
      if (!this.isTouchDevice) {
        this.isTouchDevice = true;
        if (touchControls) touchControls.style.display = 'block';
      }
    };

    // Also detect on first touch anywhere
    window.addEventListener('touchstart', () => showTouch(), { once: true });

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      showTouch();
      const touch = e.touches[0];
      const rect = joystickZone.getBoundingClientRect();
      this.joystickActive = true;
      this.joystickStart = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.joystickCurrent = { x: touch.clientX, y: touch.clientY };
    });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;
      const touch = e.touches[0];
      this.joystickCurrent = { x: touch.clientX, y: touch.clientY };
      // Move knob visually
      if (joystickKnob) {
        const dx = touch.clientX - this.joystickStart.x;
        const dy = touch.clientY - this.joystickStart.y;
        const maxDist = 40;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamp = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * clamp;
        const ky = Math.sin(angle) * clamp;
        joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
      }
    });

    const endJoystick = () => {
      this.joystickActive = false;
      this.joystickDir = { x: 0, y: 0 };
      if (joystickKnob) {
        joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
    };
    joystickZone.addEventListener('touchend', endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    actionBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.actionPressed = true;
    });
    actionBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.actionPressed = false;
    });

    if (enterBtn) {
      enterBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.enterPressed = true;
        this.keys['Enter'] = true;
      });
      enterBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.enterPressed = false;
        this.keys['Enter'] = false;
      });
    }
  }

  update() {
    // Keyboard direction
    let kx = 0, ky = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) ky -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) ky += 1;

    // Joystick direction
    if (this.joystickActive) {
      const dx = this.joystickCurrent.x - this.joystickStart.x;
      const dy = this.joystickCurrent.y - this.joystickStart.y;
      const maxDist = 50;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > JOYSTICK_DEADZONE * maxDist) {
        const nx = dx / maxDist;
        const ny = dy / maxDist;
        this.joystickDir = snap8Dir(nx, ny);
      } else {
        this.joystickDir = { x: 0, y: 0 };
      }
    }

    // Combine: keyboard takes priority, otherwise joystick
    if (kx !== 0 || ky !== 0) {
      this.direction = snap8Dir(kx, ky);
    } else {
      this.direction = this.joystickDir;
    }

    // Action button (spacebar or touch)
    const currentAction = this.keys['Space'] || this.actionPressed;
    this.actionJustPressed = currentAction && !this._prevAction;
    this._prevAction = currentAction;

    // Enter key
    const currentEnter = this.keys['Enter'] || this.keys['NumpadEnter'];
    this.enterJustPressed = currentEnter && !this._prevEnter;
    this._prevEnter = currentEnter;
  }

  isActionDown() {
    return this.keys['Space'] || this.actionPressed;
  }

  isEnterDown() {
    return this.keys['Enter'] || this.keys['NumpadEnter'];
  }

  anyKeyPressed() {
    return Object.values(this.keys).some(v => v) || this.actionPressed;
  }
}
