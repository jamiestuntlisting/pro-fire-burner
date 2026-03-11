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

    // Touch tap for menu/enter
    this._touchTap = false;

    // Joystick state
    this.joystickActive = false;
    this.joystickStart = { x: 0, y: 0 };
    this.joystickCurrent = { x: 0, y: 0 };
    this.joystickDir = { x: 0, y: 0 };

    // Mobile name input
    this._mobileNameInput = document.getElementById('mobile-name-input');
    this._mobileNameCallback = null;

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
    const touchControls = document.getElementById('touch-controls');
    if (!joystickZone || !actionBtn) return;

    this._touchControls = touchControls;

    // Auto-detect touch device on first touch anywhere
    window.addEventListener('touchstart', () => {
      this.isTouchDevice = true;
    }, { once: true });

    // Tap on canvas fires enter (for menus, call sheets, etc.)
    const canvasEl = this._canvas.canvas || this._canvas;
    canvasEl.addEventListener('touchstart', (e) => {
      this.isTouchDevice = true;
      this._touchTap = true;
    });
    canvasEl.addEventListener('touchend', () => {
      // _touchTap is consumed in update()
    });

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
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
  }

  // Show/hide game controls (joystick + action button)
  setGameControlsVisible(visible) {
    if (this._touchControls) {
      this._touchControls.style.display = visible && this.isTouchDevice ? 'block' : 'none';
    }
  }

  // Focus the hidden text input to bring up mobile keyboard for name entry
  startMobileNameEntry(callback) {
    if (!this.isTouchDevice || !this._mobileNameInput) return;
    this._mobileNameInput.value = '';
    this._mobileNameInput.style.top = '50%';
    this._mobileNameInput.style.left = '50%';
    this._mobileNameInput.style.opacity = '0';
    this._mobileNameInput.focus();
    this._mobileNameCallback = callback;

    this._mobileNameInput.addEventListener('input', () => {
      const val = this._mobileNameInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
      this._mobileNameInput.value = val;
      if (this._mobileNameCallback) {
        this._mobileNameCallback(val);
      }
    });
  }

  endMobileNameEntry() {
    if (this._mobileNameInput) {
      this._mobileNameInput.blur();
      this._mobileNameInput.style.top = '-100px';
      this._mobileNameInput.style.left = '-100px';
      this._mobileNameCallback = null;
    }
  }

  getMobileNameValue() {
    if (this._mobileNameInput) {
      return this._mobileNameInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
    }
    return '';
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

    // Enter key OR touch tap
    const currentEnter = this.keys['Enter'] || this.keys['NumpadEnter'] || this._touchTap;
    this.enterJustPressed = currentEnter && !this._prevEnter;
    this._prevEnter = currentEnter;
    // Consume tap after one frame
    this._touchTap = false;
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
