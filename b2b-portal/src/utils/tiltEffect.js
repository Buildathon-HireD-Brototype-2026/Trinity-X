/**
 * Parallax Tilt & Cursor Effect Utilities
 * Pure functions for calculating smooth 3D parallax tilt, layer shifts,
 * and accessibility guards (reduced motion, touch device disabling).
 */

/**
 * Clamps a number between min and max inclusive.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  if (Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

/**
 * Linear interpolation between current and target with precision snap.
 * @param {number} current
 * @param {number} target
 * @param {number} factor
 * @returns {number}
 */
export function lerp(current, target, factor = 0.08) {
  if (Math.abs(target - current) < 0.001) {
    return target;
  }
  return current + (target - current) * factor;
}

/**
 * Calculates rotation angles (degrees) based on pointer position relative to element bounds.
 * Clamps result strictly within [-maxTilt, maxTilt].
 *
 * @param {Object} params
 * @param {number} params.x - Pointer clientX or relative X
 * @param {number} params.y - Pointer clientY or relative Y
 * @param {number} params.width - Element clientWidth
 * @param {number} params.height - Element clientHeight
 * @param {number} [params.maxTilt=5] - Maximum tilt in degrees (default: 5)
 * @returns {{ tiltX: number, tiltY: number, nx: number, ny: number }}
 */
export function calculateTilt({ x, y, width, height, maxTilt = 5 }) {
  if (!width || !height || width <= 0 || height <= 0) {
    return { tiltX: 0, tiltY: 0, nx: 0, ny: 0 };
  }

  // Normalized offsets from element center: [-1, 1]
  const nx = clamp((x - width / 2) / (width / 2), -1, 1);
  const ny = clamp((y - height / 2) / (height / 2), -1, 1);

  // Moving down (positive ny) tilts top forward (negative rotateX)
  // Moving right (positive nx) tilts right side back (positive rotateY)
  const tiltX = clamp(-ny * maxTilt, -maxTilt, maxTilt);
  const tiltY = clamp(nx * maxTilt, -maxTilt, maxTilt);

  return {
    tiltX: Number(tiltX.toFixed(2)),
    tiltY: Number(tiltY.toFixed(2)),
    nx: Number(nx.toFixed(3)),
    ny: Number(ny.toFixed(3)),
  };
}

/**
 * Calculates layer translations based on normalized pointer coordinates.
 * Backdrop: 4px shift
 * Car: 8px shift
 * Pin: 14px shift
 *
 * @param {Object} params
 * @param {number} params.nx - Normalized X [-1, 1]
 * @param {number} params.ny - Normalized Y [-1, 1]
 * @returns {{ backdrop: { x: number, y: number }, car: { x: number, y: number }, pin: { x: number, y: number } }}
 */
export function calculateLayerShifts({ nx, ny }) {
  const clampedNx = clamp(nx, -1, 1);
  const clampedNy = clamp(ny, -1, 1);

  return {
    backdrop: {
      x: Number((clampedNx * 4).toFixed(2)),
      y: Number((clampedNy * 4).toFixed(2)),
    },
    car: {
      x: Number((clampedNx * 8).toFixed(2)),
      y: Number((clampedNy * 8).toFixed(2)),
    },
    pin: {
      x: Number((clampedNx * 14).toFixed(2)),
      y: Number((clampedNy * 14).toFixed(2)),
    },
  };
}

/**
 * Determines whether parallax cursor motion is permitted.
 * Disables for touch/pen inputs and when user prefers reduced motion.
 *
 * @param {Object} params
 * @param {boolean} [params.prefersReducedMotion=false]
 * @param {string} [params.pointerType='mouse']
 * @returns {boolean}
 */
export function isMotionAllowed({ prefersReducedMotion = false, pointerType = 'mouse' } = {}) {
  if (prefersReducedMotion) {
    return false;
  }
  if (pointerType === 'touch' || pointerType === 'pen') {
    return false;
  }
  return true;
}
