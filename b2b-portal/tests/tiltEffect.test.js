import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  lerp,
  calculateTilt,
  calculateLayerShifts,
  isMotionAllowed,
} from '../src/utils/tiltEffect.js';

test('tiltEffect: clamp bounds values strictly', () => {
  assert.equal(clamp(10, -5, 5), 5);
  assert.equal(clamp(-10, -5, 5), -5);
  assert.equal(clamp(2.5, -5, 5), 2.5);
  assert.equal(clamp(NaN, -5, 5), -5);
});

test('tiltEffect: calculateTilt clamps to +/- 5 degrees and centers at zero', () => {
  const width = 400;
  const height = 300;

  // Center position -> 0 tilt
  const center = calculateTilt({ x: 200, y: 150, width, height, maxTilt: 5 });
  assert.equal(center.tiltX, 0);
  assert.equal(center.tiltY, 0);
  assert.equal(center.nx, 0);
  assert.equal(center.ny, 0);

  // Far right edge -> tiltY = +5
  const rightEdge = calculateTilt({ x: 400, y: 150, width, height, maxTilt: 5 });
  assert.equal(rightEdge.tiltY, 5);
  assert.equal(rightEdge.tiltX, 0);

  // Far beyond right edge (overshoot) -> clamped strictly to +5
  const overshoot = calculateTilt({ x: 999, y: -500, width, height, maxTilt: 5 });
  assert.equal(overshoot.tiltY, 5);
  assert.equal(overshoot.tiltX, 5);

  // Far top edge (y=0) -> ny = -1, tiltX = +5
  const topEdge = calculateTilt({ x: 200, y: 0, width, height, maxTilt: 5 });
  assert.equal(topEdge.tiltX, 5);
  assert.equal(topEdge.tiltY, 0);

  // Invalid or zero dimensions return safe zeros
  const invalid = calculateTilt({ x: 100, y: 100, width: 0, height: 0 });
  assert.equal(invalid.tiltX, 0);
  assert.equal(invalid.tiltY, 0);
});

test('tiltEffect: calculateLayerShifts returns exact 4px, 8px, 14px shifts', () => {
  // At maximum positive deflection (nx = 1, ny = 1)
  const maxDeflection = calculateLayerShifts({ nx: 1, ny: 1 });
  assert.equal(maxDeflection.backdrop.x, 4);
  assert.equal(maxDeflection.backdrop.y, 4);
  assert.equal(maxDeflection.car.x, 8);
  assert.equal(maxDeflection.car.y, 8);
  assert.equal(maxDeflection.pin.x, 14);
  assert.equal(maxDeflection.pin.y, 14);

  // At maximum negative deflection (nx = -1, ny = -1)
  const minDeflection = calculateLayerShifts({ nx: -1, ny: -1 });
  assert.equal(minDeflection.backdrop.x, -4);
  assert.equal(minDeflection.backdrop.y, -4);
  assert.equal(minDeflection.car.x, -8);
  assert.equal(minDeflection.car.y, -8);
  assert.equal(minDeflection.pin.x, -14);
  assert.equal(minDeflection.pin.y, -14);

  // At half deflection
  const halfDeflection = calculateLayerShifts({ nx: 0.5, ny: -0.5 });
  assert.equal(halfDeflection.backdrop.x, 2);
  assert.equal(halfDeflection.backdrop.y, -2);
  assert.equal(halfDeflection.car.x, 4);
  assert.equal(halfDeflection.car.y, -4);
  assert.equal(halfDeflection.pin.x, 7);
  assert.equal(halfDeflection.pin.y, -7);
});

test('tiltEffect: isMotionAllowed disables on reduced motion and touch/pen', () => {
  // Enabled for mouse when reduced-motion is off
  assert.equal(isMotionAllowed({ prefersReducedMotion: false, pointerType: 'mouse' }), true);

  // Disabled when user prefers reduced motion
  assert.equal(isMotionAllowed({ prefersReducedMotion: true, pointerType: 'mouse' }), false);
  assert.equal(isMotionAllowed({ prefersReducedMotion: true, pointerType: 'touch' }), false);

  // Disabled for touch devices
  assert.equal(isMotionAllowed({ prefersReducedMotion: false, pointerType: 'touch' }), false);

  // Disabled for stylus / pen devices
  assert.equal(isMotionAllowed({ prefersReducedMotion: false, pointerType: 'pen' }), false);
});

test('tiltEffect: lerp smoothly approaches target and snaps when close', () => {
  // Smoothing
  const step1 = lerp(0, 10, 0.1);
  assert.equal(step1, 1);

  // Precision snap
  const snapped = lerp(9.9995, 10, 0.1);
  assert.equal(snapped, 10);
});
