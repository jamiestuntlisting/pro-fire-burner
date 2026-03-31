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

    // Touch tap / mouse click for menu/enter
    this._touchTap = false;
    this._mouseClick = false;
    this._mouseClickY = 0;
    this.clickedMenuOption = null;

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
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse click on canvas for menu selection
    const canvasEl = canvas.canvas || canvas;
    canvasEl.addEventListener('click', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      this._mouseClick = true;
      this._mouseClickX = (e.clientX - rect.left) * (canvasEl.width / rect.width);
      this._mouseClickY = (e.clientY - rect.top) * (canvasEl.height / rect.height);
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

  // Show the name entry input field and focus it
  startNameEntry(callback) {
    if (!this._mobileNameInput) return;
    this._mobileNameCallback = callback;
    this._mobileNameActive = true;
    this._mobileNameInput.value = '';
    // Position just below the "ENTER YOUR NAME" title on canvas
    const canvasEl = this._canvas.canvas || this._canvas;
    const rect = canvasEl.getBoundingClientRect();
    const scaleY = rect.height / canvasEl.height;
    const titleY = 160; // just below the title at y=140
    this._mobileNameInput.style.position = 'absolute';
    this._mobileNameInput.style.top = (rect.top + window.scrollY + titleY * scaleY) + 'px';
    this._mobileNameInput.style.left = '50%';
    this._mobileNameInput.style.bottom = 'auto';
    this._mobileNameInput.style.transform = 'translateX(-50%)';
    this._mobileNameInput.style.width = '280px';
    this._mobileNameInput.style.height = '48px';
    this._mobileNameInput.style.opacity = '1';
    this._mobileNameInput.style.fontSize = '24px';
    this._mobileNameInput.style.textAlign = 'center';
    this._mobileNameInput.style.background = '#1a1a2a';
    this._mobileNameInput.style.color = '#ffcc00';
    this._mobileNameInput.style.border = '2px solid #ff6600';
    this._mobileNameInput.style.borderRadius = '8px';
    this._mobileNameInput.style.fontFamily = 'monospace';
    this._mobileNameInput.style.zIndex = '200';
    this._mobileNameInput.style.letterSpacing = '4px';
    this._mobileNameInput.style.outline = 'none';
    this._mobileNameInput.focus();

    // Focus on any tap or click (for mobile keyboard)
    this._nameEntryFocusHandler = () => {
      if (this._mobileNameActive) {
        this._mobileNameInput.focus();
      }
    };
    document.addEventListener('touchstart', this._nameEntryFocusHandler);
    document.addEventListener('click', this._nameEntryFocusHandler);

    // Handle enter key inside the input to submit
    this._nameEntryKeyHandler = (e) => {
      if (e.key === 'Enter' && this._mobileNameActive) {
        this.enterJustPressed = true;
      }
    };
    this._mobileNameInput.addEventListener('keydown', this._nameEntryKeyHandler);

    // Filter input to uppercase letters only
    this._mobileNameInputHandler = () => {
      const val = this._mobileNameInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
      this._mobileNameInput.value = val;
      if (this._mobileNameCallback) {
        this._mobileNameCallback(val);
      }
    };
    this._mobileNameInput.addEventListener('input', this._mobileNameInputHandler);
  }

  // Keep old name for backwards compat
  startMobileNameEntry(callback) {
    this.startNameEntry(callback);
  }

  endNameEntry() {
    this._mobileNameActive = false;
    if (this._mobileNameInput) {
      this._mobileNameInput.blur();
      this._mobileNameInput.style.position = 'absolute';
      this._mobileNameInput.style.top = '-100px';
      this._mobileNameInput.style.left = '-100px';
      this._mobileNameInput.style.width = '1px';
      this._mobileNameInput.style.height = '1px';
      this._mobileNameInput.style.opacity = '0';
      this._mobileNameInput.style.transform = '';
      this._mobileNameCallback = null;
      if (this._mobileNameInputHandler) {
        this._mobileNameInput.removeEventListener('input', this._mobileNameInputHandler);
      }
      if (this._nameEntryKeyHandler) {
        this._mobileNameInput.removeEventListener('keydown', this._nameEntryKeyHandler);
      }
    }
    if (this._nameEntryFocusHandler) {
      document.removeEventListener('touchstart', this._nameEntryFocusHandler);
      document.removeEventListener('click', this._nameEntryFocusHandler);
    }
  }

  endMobileNameEntry() {
    this.endNameEntry();
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

    // Enter key OR touch tap OR mouse click
    const currentEnter = this.keys['Enter'] || this.keys['NumpadEnter'] || this._touchTap || this._mouseClick;
    this.enterJustPressed = currentEnter && !this._prevEnter;
    this._prevEnter = currentEnter;
    // Consume tap/click after one frame
    this._touchTap = false;
    this._mouseClick = false;
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
