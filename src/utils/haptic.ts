/** Trigger device haptic feedback. Silently no-ops if unsupported. */
export function haptic(type: 'light' | 'medium' | 'confirm' = 'light') {
  try {
    const pattern = type === 'light' ? 10 : type === 'medium' ? 20 : 40;
    navigator.vibrate(pattern);
  } catch {
    // Not supported — ignore
  }
}
