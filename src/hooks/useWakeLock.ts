import { useEffect } from 'react';

/** Prevent the screen from sleeping while `active` is true. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Permission denied or unsupported — ignore
      }
    };

    acquire();

    // Re-acquire if page becomes visible again (e.g. tab switch)
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !lock) acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release();
    };
  }, [active]);
}
