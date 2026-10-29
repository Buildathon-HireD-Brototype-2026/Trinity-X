import { useState, useEffect } from 'react';

/**
 * Hook to auto-detect screen height, width, and responsive breakpoints.
 * Also dynamically applies responsive CSS variables to the document root
 * so CSS layout, alignment, and container sizing automatically adjust.
 */
export function useScreenDimensions() {
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1440,
        height: 900,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        orientation: 'landscape'
      };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024 && width < 1536,
      isWide: width >= 1536,
      orientation: height > width ? 'portrait' : 'landscape'
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = null;

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Auto-adjust CSS variables for container and canvas sizing
        const root = document.documentElement;
        root.style.setProperty('--screen-width', `${width}px`);
        root.style.setProperty('--screen-height', `${height}px`);
        root.style.setProperty('--content-available-height', `${Math.max(400, height - 64)}px`);

        // Dynamically compute optimal container max-width:
        // Ultra-wide (>1680px) -> 1600px centered
        // Desktop (1440px - 1680px) -> 1520px
        // Smaller displays -> 100% fluid
        let containerMaxWidth = '1600px';
        if (width < 1200) {
          containerMaxWidth = '100%';
        } else if (width < 1600) {
          containerMaxWidth = `${width - 48}px`;
        }
        root.style.setProperty('--container-max-width', containerMaxWidth);

        setDimensions({
          width,
          height,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024 && width < 1536,
          isWide: width >= 1536,
          orientation: height > width ? 'portrait' : 'landscape'
        });
      });
    };

    // Initial trigger
    handleResize();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return dimensions;
}

export default useScreenDimensions;
