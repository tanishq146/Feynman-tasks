// ─── useResponsive ──────────────────────────────────────────────────────────
// Shared hook that returns device-tier booleans.
// Updates on window resize (debounced). SSR-safe.

import { useState, useEffect } from 'react';

const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
};

function getDevice(w) {
    return {
        isMobile: w <= BREAKPOINTS.mobile,
        isTablet: w > BREAKPOINTS.mobile && w <= BREAKPOINTS.tablet,
        isDesktop: w > BREAKPOINTS.tablet,
        isTouchDevice: w <= BREAKPOINTS.tablet,   // mobile OR tablet
        width: w,
    };
}

export function useResponsive() {
    const [device, setDevice] = useState(() =>
        getDevice(typeof window !== 'undefined' ? window.innerWidth : 1200)
    );

    useEffect(() => {
        let timeout;
        const handler = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => setDevice(getDevice(window.innerWidth)), 100);
        };
        window.addEventListener('resize', handler);
        // also listen for orientation change on mobile
        window.addEventListener('orientationchange', handler);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', handler);
            window.removeEventListener('orientationchange', handler);
        };
    }, []);

    return device;
}
