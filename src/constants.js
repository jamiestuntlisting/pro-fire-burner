export const TILE_SIZE = 48;
export const PLAYER_SPEED = 360;
export const VIEWPORT_WIDTH = 960;
export const VIEWPORT_HEIGHT = 540;
export const GEL_DEPLETION_BASE = 22.5;
export const FUEL_DEPLETION_BASE = 7.5;
export const GEL_MAX = 100;
export const FUEL_MAX = 100;
export const GEL_PICKUP_AMOUNT = 25;
export const FUEL_PICKUP_AMOUNT = 20;
export const FIRE_TRAIL_LIFETIME = 2.5;
export const FOV_GRACE_PERIOD = 2.0;
export const EXTRA_CATCH_RADIUS = 1.5;
export const PRINCIPAL_CATCH_RADIUS = 2.0;
export const TORCH_EFFECT_RADIUS = 2.0;
export const TORCH_DRAIN_MULTIPLIER = 1.5;
export const PROPANE_DRAIN_AMOUNT = 15;
export const JOYSTICK_DEADZONE = 0.15;
export const CAMERA_LERP_SPEED = 0.15;
export const TICK_RATE = 1 / 60;

// End state reasons
export const END_REASONS = {
  BURNED: { message: 'YOU BURNED!', subtitle: 'Ran out of protective gel!', icon: '🔥', isGameOver: true, priority: 2 },
  BURNED_NO_FUEL: { message: 'FLAME OUT!', subtitle: 'Ran out of fuel!', icon: '💨', isGameOver: true, priority: 2 },
  BURNED_EXTINGUISHED: { message: 'EXTINGUISHED!', subtitle: 'Fire safeties put you out!', icon: '🧯', isGameOver: true, priority: 2 },
  LOST_THE_SHOT: { message: 'LOST THE SHOT!', subtitle: 'Stayed off camera too long!', icon: '🎬', isGameOver: true, priority: 4 },
  ROADKILL: { message: 'ROADKILL!', subtitle: 'Hit by the camera car!', icon: '🚗', isGameOver: true, priority: 3 },
  PA_ATTACK: { message: 'PA ATTACK!', subtitle: 'Set a principal on fire!', icon: '📋', isGameOver: true, priority: 1 },
  CLEAN_BURN: { message: 'CLEAN BURN!', subtitle: 'Perfect fuel management!', icon: '⭐', isGameOver: false, priority: 7 },
  SAFE_OUT: { message: 'SAFE OUT!', subtitle: 'Safely extinguished!', icon: '👍', isGameOver: false, priority: 8 },
  EXTINGUISHED: { message: 'EXTINGUISHED!', subtitle: 'Fire safeties got you!', icon: '❄️', isGameOver: false, priority: 5 },
  FELL_IN_WATER: { message: 'FELL IN WATER!', subtitle: 'Walked into water!', icon: '💦', isGameOver: false, priority: 6 },
};

// Tile types
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_WATER = 2;
export const TILE_PROP1 = 3;
export const TILE_PROP2 = 4;
export const TILE_PROP3 = 5;
