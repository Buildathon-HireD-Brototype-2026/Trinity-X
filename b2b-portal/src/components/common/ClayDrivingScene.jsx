import React, { useRef, useEffect } from 'react';
import {
  calculateTilt,
  calculateLayerShifts,
  lerp,
  isMotionAllowed,
} from '../../utils/tiltEffect';

/**
 * ClayDrivingScene
 *
 * A modern, 3D clay-style driving illustration built purely with inline SVG and CSS.
 * Features:
 * - Friendly rounded clay-style car in HireD brand purple
 * - Soft glass window with friendly driver silhouette inside
 * - Two chunky rounded wheels with soft rim highlights
 * - Floating 3D location pin and soft ambient shadows
 * - Layered parallax cursor effect (tilt up to 5deg, backdrop 4px, car 8px, pin 14px)
 * - Idle 6s float animation that pauses on tab hide and reduced motion
 * - Adapts cleanly to dark mode via CSS variables
 * - Supports an optional `imageSrc` prop (e.g. for login-clay.webp) as a licensed asset override
 */
export function ClayDrivingScene({
  imageSrc = null,
  ariaLabel = 'Illustration of a driver in a car',
  ariaHidden = false,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null);
  const rafIdRef = useRef(null);
  const isHoveredRef = useRef(false);

  // Motion state kept in refs to avoid React re-renders during mousemove
  const stateRef = useRef({
    targetTiltX: 0,
    targetTiltY: 0,
    currentTiltX: 0,
    currentTiltY: 0,
    targetNx: 0,
    targetNy: 0,
    currentNx: 0,
    currentNy: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Listen across the entire left panel container for full-panel parallax response
    const triggerElement = container.closest('.login-left-panel') || container;

    // Check prefers-reduced-motion media query
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateLayerProperties = () => {
      const s = stateRef.current;
      // Lerp tilt angles
      s.currentTiltX = lerp(s.currentTiltX, s.targetTiltX, 0.08);
      s.currentTiltY = lerp(s.currentTiltY, s.targetTiltY, 0.08);

      // Lerp normalized coordinates for layer shifts
      s.currentNx = lerp(s.currentNx, s.targetNx, 0.08);
      s.currentNy = lerp(s.currentNy, s.targetNy, 0.08);

      const shifts = calculateLayerShifts({ nx: s.currentNx, ny: s.currentNy });

      // Apply CSS variables on container directly (zero React re-renders)
      container.style.setProperty('--clay-tilt-x', `${s.currentTiltX.toFixed(2)}deg`);
      container.style.setProperty('--clay-tilt-y', `${s.currentTiltY.toFixed(2)}deg`);
      container.style.setProperty('--clay-shift-backdrop-x', `${shifts.backdrop.x}px`);
      container.style.setProperty('--clay-shift-backdrop-y', `${shifts.backdrop.y}px`);
      container.style.setProperty('--clay-shift-car-x', `${shifts.car.x}px`);
      container.style.setProperty('--clay-shift-car-y', `${shifts.car.y}px`);
      container.style.setProperty('--clay-shift-pin-x', `${shifts.pin.x}px`);
      container.style.setProperty('--clay-shift-pin-y', `${shifts.pin.y}px`);

      // Keep animation running while hovered or during ease-back
      const isResting =
        !isHoveredRef.current &&
        Math.abs(s.currentTiltX) < 0.01 &&
        Math.abs(s.currentTiltY) < 0.01 &&
        Math.abs(s.currentNx) < 0.005 &&
        Math.abs(s.currentNy) < 0.005;

      if (!isResting && !document.hidden && !motionQuery.matches) {
        rafIdRef.current = requestAnimationFrame(updateLayerProperties);
      } else {
        rafIdRef.current = null;
        if (isResting) {
          // Snap strictly to zero
          container.style.setProperty('--clay-tilt-x', '0deg');
          container.style.setProperty('--clay-tilt-y', '0deg');
          container.style.setProperty('--clay-shift-backdrop-x', '0px');
          container.style.setProperty('--clay-shift-backdrop-y', '0px');
          container.style.setProperty('--clay-shift-car-x', '0px');
          container.style.setProperty('--clay-shift-car-y', '0px');
          container.style.setProperty('--clay-shift-pin-x', '0px');
          container.style.setProperty('--clay-shift-pin-y', '0px');
        }
      }
    };

    const handlePointerEnter = (e) => {
      if (!isMotionAllowed({ prefersReducedMotion: motionQuery.matches, pointerType: e.pointerType })) {
        return;
      }
      isHoveredRef.current = true;
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(updateLayerProperties);
      }
    };

    const handlePointerMove = (e) => {
      if (!isMotionAllowed({ prefersReducedMotion: motionQuery.matches, pointerType: e.pointerType })) {
        return;
      }
      isHoveredRef.current = true;
      const rect = triggerElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const { tiltX, tiltY, nx, ny } = calculateTilt({
        x,
        y,
        width: rect.width,
        height: rect.height,
        maxTilt: 5,
      });

      stateRef.current.targetTiltX = tiltX;
      stateRef.current.targetTiltY = tiltY;
      stateRef.current.targetNx = nx;
      stateRef.current.targetNy = ny;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(updateLayerProperties);
      }
    };

    const handlePointerLeave = () => {
      isHoveredRef.current = false;
      // Reset targets to zero for ease-back to rest (~400ms duration via lerp)
      stateRef.current.targetTiltX = 0;
      stateRef.current.targetTiltY = 0;
      stateRef.current.targetNx = 0;
      stateRef.current.targetNy = 0;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(updateLayerProperties);
      }
    };

    // Pause idle animations and RAF loop when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        container.classList.add('clay-paused');
      } else {
        container.classList.remove('clay-paused');
        if (isHoveredRef.current) {
          rafIdRef.current = requestAnimationFrame(updateLayerProperties);
        }
      }
    };

    triggerElement.addEventListener('pointerenter', handlePointerEnter);
    triggerElement.addEventListener('pointermove', handlePointerMove);
    triggerElement.addEventListener('pointerleave', handlePointerLeave);
    triggerElement.addEventListener('mousemove', handlePointerMove);
    triggerElement.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      triggerElement.removeEventListener('pointerenter', handlePointerEnter);
      triggerElement.removeEventListener('pointermove', handlePointerMove);
      triggerElement.removeEventListener('pointerleave', handlePointerLeave);
      triggerElement.removeEventListener('mousemove', handlePointerMove);
      triggerElement.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`clay-scene-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto',
        perspective: '1000px',
        ...style,
      }}
      role={ariaHidden ? undefined : 'img'}
      aria-label={ariaHidden ? undefined : ariaLabel}
      aria-hidden={ariaHidden ? 'true' : undefined}
    >
      <div className="clay-scene-float clay-float-idle">
        <div className="clay-scene-tilt">
          {imageSrc ? (
            /* Optional licensed image override if provided */
            <img
              src={imageSrc}
              alt={ariaLabel}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 'var(--radius-lg)',
                objectFit: 'contain',
              }}
            />
          ) : (
            /* Pristine 3D Clay Driving Scene in pure inline SVG */
            <svg
              viewBox="0 0 460 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="clay-svg-root"
              aria-hidden="true"
              style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
            >
              <defs>
                {/* 1. Backdrop Gradients */}
                <radialGradient
                  id="clayBackdropGrad"
                  cx="50%"
                  cy="45%"
                  r="55%"
                  fx="35%"
                  fy="30%"
                >
                  <stop offset="0%" stopColor="var(--clay-bg-start, #EDE9FE)" />
                  <stop offset="65%" stopColor="var(--clay-bg-mid, #DDD6FE)" />
                  <stop offset="100%" stopColor="var(--clay-bg-end, #C4B5FD)" />
                </radialGradient>

                <radialGradient
                  id="clayMiniBubbleGrad"
                  cx="40%"
                  cy="35%"
                  r="60%"
                >
                  <stop offset="0%" stopColor="var(--clay-bubble-start, #FAF5FF)" />
                  <stop offset="100%" stopColor="var(--clay-bubble-end, #E9D5FF)" />
                </radialGradient>

                {/* 2. Soft Clay Ambient Shadows */}
                <filter id="clayCarShadow" x="-20%" y="-40%" width="140%" height="180%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>
                <filter id="clayPinShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" />
                </filter>
                <filter id="clayWheelShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>

                {/* 3. Clay Car Body Gradients */}
                <linearGradient id="clayCarBody" x1="15%" y1="10%" x2="85%" y2="90%">
                  <stop offset="0%" stopColor="var(--clay-car-top, #8B5CF6)" />
                  <stop offset="45%" stopColor="var(--clay-car-mid, #6A379F)" />
                  <stop offset="100%" stopColor="var(--clay-car-base, #4C1D95)" />
                </linearGradient>

                <linearGradient id="clayCarHighlight" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <stop offset="40%" stopColor="#EDE9FE" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
                </linearGradient>

                {/* 4. Glass Window Gradient & Sheen */}
                <linearGradient id="clayGlass" x1="10%" y1="10%" x2="90%" y2="90%">
                  <stop offset="0%" stopColor="rgba(245, 243, 255, 0.95)" />
                  <stop offset="50%" stopColor="rgba(224, 231, 255, 0.8)" />
                  <stop offset="100%" stopColor="rgba(196, 181, 253, 0.65)" />
                </linearGradient>

                <linearGradient id="clayGlassSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                {/* 5. Driver Clay Gradients */}
                <linearGradient id="clayDriverCap" x1="10%" y1="10%" x2="90%" y2="90%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#431407" />
                </linearGradient>
                <linearGradient id="clayDriverSkin" x1="20%" y1="20%" x2="80%" y2="80%">
                  <stop offset="0%" stopColor="#FED7AA" />
                  <stop offset="100%" stopColor="#FDBA74" />
                </linearGradient>
                <linearGradient id="clayDriverShirt" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#581C87" />
                  <stop offset="100%" stopColor="#3B0764" />
                </linearGradient>

                {/* 6. Chunky Wheel Gradients */}
                <radialGradient id="clayTire" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="60%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1E293B" />
                </radialGradient>
                <radialGradient id="clayHubcap" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#E9D5FF" />
                  <stop offset="50%" stopColor="#C084FC" />
                  <stop offset="100%" stopColor="#7E22CE" />
                </radialGradient>

                {/* 7. Floating Location Pin Gradient */}
                <linearGradient id="clayPinGrad" x1="15%" y1="10%" x2="85%" y2="90%">
                  <stop offset="0%" stopColor="#D8B4FE" />
                  <stop offset="30%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#6B21A8" />
                </linearGradient>

                {/* 8. Lights & Sparkle Gradients */}
                <radialGradient id="clayHeadlight" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="60%" stopColor="#FDE047" />
                  <stop offset="100%" stopColor="#EAB308" />
                </radialGradient>
                <radialGradient id="clayTaillight" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FECACA" />
                  <stop offset="60%" stopColor="#F87171" />
                  <stop offset="100%" stopColor="#DC2626" />
                </radialGradient>

                {/* 9. Road/Ground Gradient */}
                <linearGradient id="clayRoad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="var(--clay-road-fade, rgba(226, 232, 240, 0))" />
                  <stop offset="25%" stopColor="var(--clay-road-mid, #E2E8F0)" />
                  <stop offset="50%" stopColor="var(--clay-road-center, #CBD5E1)" />
                  <stop offset="75%" stopColor="var(--clay-road-mid, #E2E8F0)" />
                  <stop offset="100%" stopColor="var(--clay-road-fade, rgba(226, 232, 240, 0))" />
                </linearGradient>
              </defs>

              {/* =======================================================
                  LAYER 1: Soft Clay Backdrop (Parallax Shift: 4px)
                  ======================================================= */}
              <g className="clay-layer-backdrop">
                {/* Main large soft lavender clay bubble */}
                <circle cx="230" cy="155" r="125" fill="url(#clayBackdropGrad)" />

                {/* Secondary buoyant clay spheres */}
                <circle cx="345" cy="85" r="32" fill="url(#clayMiniBubbleGrad)" opacity="0.8" />
                <circle cx="95" cy="120" r="22" fill="url(#clayMiniBubbleGrad)" opacity="0.65" />
                <circle cx="125" cy="72" r="12" fill="url(#clayMiniBubbleGrad)" opacity="0.45" />

                {/* Soft decorative clay capsule */}
                <rect
                  x="330"
                  y="190"
                  width="48"
                  height="16"
                  rx="8"
                  fill="url(#clayMiniBubbleGrad)"
                  opacity="0.5"
                />
              </g>

              {/* =======================================================
                  LAYER 2: Road Surface & Ground Ambient Shadows
                  ======================================================= */}
              <g className="clay-layer-ground">
                {/* Wide soft ambient shadow beneath the vehicle */}
                <ellipse
                  cx="230"
                  cy="256"
                  rx="135"
                  ry="16"
                  fill="var(--clay-ambient-shadow, rgba(58, 20, 95, 0.22))"
                  filter="url(#clayCarShadow)"
                />

                {/* Soft rounded clay ground pathway */}
                <path
                  d="M 65 254 C 130 250, 330 250, 395 254 C 360 264, 100 264, 65 254 Z"
                  fill="url(#clayRoad)"
                />

                {/* Subtle road dashed center marks in clay style */}
                <rect x="185" y="254" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.55" />
                <rect x="235" y="254" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.55" />
                <rect x="285" y="254" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.55" />
              </g>

              {/* =======================================================
                  LAYER 3: 3D Clay Car & Driver (Parallax Shift: 8px)
                  ======================================================= */}
              <g className="clay-layer-car">
                {/* Wheel ground contact shadows */}
                <ellipse cx="168" cy="248" rx="24" ry="7" fill="rgba(30, 41, 59, 0.35)" filter="url(#clayWheelShadow)" />
                <ellipse cx="308" cy="248" rx="24" ry="7" fill="rgba(30, 41, 59, 0.35)" filter="url(#clayWheelShadow)" />

                {/* Main Clay Car Body (Smooth plump silhouette) */}
                <path
                  d="M 120 206 C 120 188, 134 176, 160 174 L 182 174 C 204 134, 222 124, 272 124 L 298 124 C 322 124, 336 142, 344 174 L 358 176 C 374 180, 382 192, 382 208 L 382 220 C 382 228, 376 232, 366 232 L 136 232 C 126 232, 120 228, 120 220 Z"
                  fill="url(#clayCarBody)"
                />

                {/* Top Shoulder Clay Gloss Highlight */}
                <path
                  d="M 162 176 C 182 174, 202 136, 270 126 C 295 126, 318 138, 332 168 C 305 140, 260 134, 205 158 C 180 170, 168 174, 162 176 Z"
                  fill="url(#clayCarHighlight)"
                />

                {/* Lower Side Clay Flare Highlight */}
                <path
                  d="M 130 216 C 170 212, 320 212, 372 216 C 360 222, 140 222, 130 216 Z"
                  fill="#FFFFFF"
                  opacity="0.16"
                />

                {/* Clay Front Bumper Pod */}
                <rect x="368" y="208" width="16" height="12" rx="6" fill="#7C3AED" />

                {/* Clay Rear Bumper Pod */}
                <rect x="116" y="208" width="12" height="12" rx="6" fill="#581C87" />

                {/* Clay Front Headlight (Warm Amber Glow) */}
                <circle cx="376" cy="196" r="8" fill="url(#clayHeadlight)" />
                <circle cx="374" cy="194" r="3" fill="#FFFFFF" opacity="0.8" />

                {/* Clay Rear Taillight (Ruby Glow) */}
                <circle cx="122" cy="196" r="6" fill="url(#clayTaillight)" />
                <circle cx="121" cy="195" r="2" fill="#FFFFFF" opacity="0.75" />

                {/* Clay Window Cavity Frame */}
                <path
                  d="M 194 172 C 208 140, 222 132, 266 132 L 292 132 C 312 132, 324 146, 330 172 Z"
                  fill="#4C1D95"
                />

                {/* Window Soft Glass Fill */}
                <path
                  d="M 196 170 C 210 142, 224 135, 264 135 L 290 135 C 308 135, 320 148, 326 170 Z"
                  fill="url(#clayGlass)"
                />

                {/* Inside Glass: Friendly Clay Driver Silhouette */}
                <g className="clay-driver-figure">
                  {/* Driver Uniform Shoulders */}
                  <path
                    d="M 236 170 C 238 158, 252 152, 268 152 C 282 152, 292 158, 296 170 Z"
                    fill="url(#clayDriverShirt)"
                  />

                  {/* Driver Shirt White Collar */}
                  <polygon points="262,154 268,162 274,154" fill="#FFFFFF" />

                  {/* Driver Neck */}
                  <rect x="264" y="148" width="8" height="6" rx="3" fill="url(#clayDriverSkin)" />

                  {/* Driver Head (Friendly rounded clay shape) */}
                  <circle cx="268" cy="144" r="10" fill="url(#clayDriverSkin)" />

                  {/* Driver Smile (Friendly curved line) */}
                  <path
                    d="M 268 146 Q 272 149 274 146"
                    stroke="#C2410C"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Driver Chauffeur Cap (Visor & Peak) */}
                  <path
                    d="M 258 142 C 259 135, 276 135, 278 142 Z"
                    fill="url(#clayDriverCap)"
                  />
                  <rect x="262" y="141" width="16" height="3" rx="1.5" fill="#1E1B4B" />

                  {/* Steering Wheel Rim */}
                  <circle
                    cx="294"
                    cy="164"
                    r="8"
                    stroke="#1E293B"
                    strokeWidth="2.5"
                    fill="none"
                  />
                </g>

                {/* Glass Diagonal Sheen Reflection */}
                <path
                  d="M 218 170 L 254 135 L 264 135 L 228 170 Z"
                  fill="url(#clayGlassSheen)"
                />
                <path
                  d="M 276 170 L 298 142 L 304 142 L 282 170 Z"
                  fill="url(#clayGlassSheen)"
                  opacity="0.6"
                />

                {/* Two Chunky Rounded Wheels */}
                {/* Rear Wheel (Left) */}
                <g className="clay-wheel-rear">
                  <circle cx="168" cy="226" r="26" fill="url(#clayTire)" />
                  <circle cx="168" cy="226" r="17" fill="url(#clayHubcap)" />
                  <circle cx="168" cy="226" r="8" fill="#581C87" />
                  <circle cx="168" cy="226" r="4" fill="#E9D5FF" />
                  <circle cx="164" cy="222" r="3" fill="#FFFFFF" opacity="0.6" />
                </g>

                {/* Front Wheel (Right) */}
                <g className="clay-wheel-front">
                  <circle cx="308" cy="226" r="26" fill="url(#clayTire)" />
                  <circle cx="308" cy="226" r="17" fill="url(#clayHubcap)" />
                  <circle cx="308" cy="226" r="8" fill="#581C87" />
                  <circle cx="308" cy="226" r="4" fill="#E9D5FF" />
                  <circle cx="304" cy="222" r="3" fill="#FFFFFF" opacity="0.6" />
                </g>
              </g>

              {/* =======================================================
                  LAYER 4: Floating 3D Location Pin & Sparkles (Shift: 14px)
                  ======================================================= */}
              <g className="clay-layer-pin">
                {/* Pin Floating Shadow on car roof */}
                <ellipse
                  cx="286"
                  cy="114"
                  rx="14"
                  ry="4.5"
                  fill="rgba(58, 20, 95, 0.28)"
                  filter="url(#clayPinShadow)"
                />

                {/* Floating Clay 3D Location Pin */}
                <path
                  d="M 286 108 C 274 94, 268 82, 268 70 C 268 54, 276 46, 286 46 C 296 46, 304 54, 304 70 C 304 82, 298 94, 286 108 Z"
                  fill="url(#clayPinGrad)"
                />

                {/* Pin Curved Clay Highlight */}
                <path
                  d="M 286 48 C 293 48, 299 54, 301 64 C 296 56, 289 53, 280 56 C 281 51, 284 48, 286 48 Z"
                  fill="#FFFFFF"
                  opacity="0.6"
                />

                {/* Pin Center Core Hole (Plump Clay Style) */}
                <circle cx="286" cy="69" r="8.5" fill="#4C1D95" />
                <circle cx="286" cy="69" r="6.5" fill="#FAF5FF" />
                <circle cx="284" cy="67" r="2.2" fill="#FFFFFF" />

                {/* Sparkle 1 (Top Left) */}
                <g transform="translate(108, 92)">
                  <path
                    d="M 0 -7 Q 0 0 7 0 Q 0 0 0 7 Q 0 0 -7 0 Q 0 0 0 -7 Z"
                    fill="#C084FC"
                  />
                  <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
                </g>

                {/* Sparkle 2 (Right Near Pin) */}
                <g transform="translate(332, 60)">
                  <path
                    d="M 0 -9 Q 0 0 9 0 Q 0 0 0 9 Q 0 0 -9 0 Q 0 0 0 -9 Z"
                    fill="#DDD6FE"
                  />
                  <circle cx="0" cy="0" r="1.8" fill="#FFFFFF" />
                </g>

                {/* Sparkle 3 (Small soft star) */}
                <g transform="translate(365, 140)">
                  <path
                    d="M 0 -5 Q 0 0 5 0 Q 0 0 0 5 Q 0 0 -5 0 Q 0 0 0 -5 Z"
                    fill="#E9D5FF"
                    opacity="0.8"
                  />
                </g>
              </g>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClayDrivingScene;
