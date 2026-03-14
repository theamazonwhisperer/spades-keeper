import { toPng } from 'html-to-image';
import { haptic } from './haptic';

interface ShareOptions {
  element: HTMLElement;
  isDark: boolean;
  title?: string;
  text?: string;
  fallbackText?: string;
}

/**
 * Temporarily set overflow to visible on an element and all its descendants,
 * returning a function to restore the original values.
 */
function forceOverflowVisible(root: HTMLElement): () => void {
  const saved: { el: HTMLElement; overflow: string; overflowX: string }[] = [];

  const walk = (el: HTMLElement) => {
    const computed = getComputedStyle(el);
    if (computed.overflow !== 'visible' || computed.overflowX !== 'visible') {
      saved.push({
        el,
        overflow: el.style.overflow,
        overflowX: el.style.overflowX,
      });
      el.style.overflow = 'visible';
      el.style.overflowX = 'visible';
    }
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      if (child instanceof HTMLElement) walk(child);
    }
  };

  walk(root);

  return () => {
    saved.forEach(({ el, overflow, overflowX }) => {
      el.style.overflow = overflow;
      el.style.overflowX = overflowX;
    });
  };
}

/**
 * Capture a DOM element as a PNG and share/download it.
 * Falls back to text clipboard if image capture fails.
 */
export async function shareScorecard({
  element,
  isDark,
  title = 'SpadesKeeper',
  text = 'Check out the scores!',
  fallbackText,
}: ShareOptions): Promise<void> {
  haptic('light');

  let blob: Blob | null = null;

  try {
    // Force all overflow visible (including nested tables/scrollable areas)
    const restoreOverflow = forceOverflowVisible(element);

    const prevHeight = element.style.height;
    const prevPadding = element.style.padding;
    element.style.height = 'auto';
    element.style.padding = '16px';

    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 150));

    const dataUrl = await toPng(element, {
      backgroundColor: isDark ? '#0e1117' : '#f0f3f6',
      pixelRatio: 2,
    });

    // Restore all styles
    element.style.height = prevHeight;
    element.style.padding = prevPadding;
    restoreOverflow();

    const res = await fetch(dataUrl);
    blob = await res.blob();
  } catch {
    // Image capture failed
  }

  if (blob) {
    if (navigator.share) {
      const file = new File([blob], 'spades-scorecard.png', { type: 'image/png' });
      try {
        await navigator.share({ title, text, files: [file] });
        return;
      } catch {
        // Fall through to download
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spades-scorecard.png';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Final fallback: text
  if (fallbackText) {
    try { await navigator.clipboard.writeText(fallbackText); } catch { /* ignore */ }
  }
}
