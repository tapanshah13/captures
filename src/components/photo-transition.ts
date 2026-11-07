const finished = (animation: Animation) => animation.finished.catch(() => undefined);
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let hiddenPrint: HTMLElement | null = null;
let originalOpacity = '';

export function restoreTransitionPrint() {
  if (hiddenPrint) {
    hiddenPrint.style.opacity = originalOpacity;
    hiddenPrint.classList.remove('morph-frame-only');
  }
  hiddenPrint = null;
}

function geometry(image: HTMLElement, rotated: boolean) {
  const rect = image.getBoundingClientRect();
  const print = image.closest<HTMLElement>('.pile-print');
  return {
    cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2,
    width: rotated ? image.offsetWidth : rect.width,
    height: rotated ? image.offsetHeight : rect.height,
    rotation: rotated && print ? parseFloat(getComputedStyle(print).getPropertyValue('--rotation')) || 0 : 0,
  };
}

// Resize the crop box instead of stretching its image pixels.
function boxFrame(box: ReturnType<typeof geometry>) {
  return {
    left: `${box.cx - box.width / 2}px`, top: `${box.cy - box.height / 2}px`,
    width: `${box.width}px`, height: `${box.height}px`,
    transform: `rotate(${box.rotation}deg)`,
  };
}

function cloneImage(dialog: HTMLElement, image: HTMLElement, from: ReturnType<typeof geometry>) {
  const img = image.querySelector('img');
  const clone = document.createElement('div');
  clone.className = 'photo-morph-clone';
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    left: `${from.cx - from.width / 2}px`, top: `${from.cy - from.height / 2}px`,
    width: `${from.width}px`, height: `${from.height}px`,
    backgroundImage: `url(${JSON.stringify(img?.currentSrc || img?.src || '')})`,
  });
  // The native dialog is in the top layer: its clone must be in that layer too.
  dialog.appendChild(clone);
  return clone;
}

export async function transitionPhoto(change: () => void, print: HTMLElement | null, opening: boolean) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const printCard = print?.closest<HTMLElement>('.pile-print');
  const rect = print?.getBoundingClientRect();
  const morph = !reduced && print?.isConnected && printCard && !printCard.classList.contains('is-flipped') && rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  if (!morph || !print || !printCard) {
    if (!opening) {
      const dialog = document.querySelector<HTMLElement>('.lb');
      dialog?.classList.add('is-closing');
      await pause(reduced ? 150 : 250);
      restoreTransitionPrint();
    }
    change();
    if (opening) await pause(reduced ? 150 : 250);
    return;
  }
  let clone: HTMLElement | null = null;
  let image: HTMLElement | null = null;
  const animations: Animation[] = [];
  document.documentElement.classList.add('manual-photo-morph');
  try {
    // Read the source before opening can change scroll locking or focus.
    const start = opening ? geometry(print, true) : null;
    if (opening) change();
    const dialog = document.querySelector<HTMLElement>('.lb');
    image = dialog?.querySelector<HTMLElement>('.lb-img') ?? null;
    if (!dialog || !image) return;
    const info = dialog.querySelector<HTMLElement>('.lb-meta');
    const close = dialog.querySelector<HTMLElement>('.lb-x');
    if (opening) {
      image.style.visibility = 'hidden';
      const img = image.querySelector('img');
      if (img) await Promise.race([img.decode().catch(() => undefined), pause(2000)]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const target = geometry(image, false);
      clone = cloneImage(dialog, image, start!);
      hiddenPrint = printCard;
      originalOpacity = printCard.style.opacity;
      const frameOpacity = getComputedStyle(printCard).opacity;
      printCard.classList.add('morph-frame-only');
      printCard.style.opacity = '0';
      animations.push(printCard.animate([{ opacity: frameOpacity }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'both' }));
      const motion = clone.animate([
        boxFrame(start!),
        boxFrame(target),
      ], { duration: 560, easing: 'cubic-bezier(.3,1.25,.5,1)', fill: 'forwards' });
      animations.push(motion);
      if (close) animations.push(close.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 250, fill: 'both' }));
      await finished(motion);
      image.style.visibility = '';
      dialog.classList.add('morph-landed');
      const handoff = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 80, easing: 'ease', fill: 'forwards' });
      animations.push(handoff);
      let reveal: Animation | undefined;
      if (info) {
        reveal = info.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, delay: 80, easing: 'ease-out', fill: 'both' });
        animations.push(reveal);
      }
      await finished(handoff);
      clone.remove(); clone = null;
      if (reveal) await finished(reveal);
      dialog.classList.add('morph-complete');
    } else {
      dialog.classList.add('morph-landed');
      const fades = [info, close].filter((el): el is HTMLElement => !!el).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
      animations.push(...fades);
      await Promise.all(fades.map(finished));
      const from = geometry(image, false), to = geometry(print, true);
      clone = cloneImage(dialog, image, from);
      image.style.visibility = 'hidden';
      dialog.classList.add('morph-closing');
      printCard.classList.add('morph-frame-only');
      printCard.style.opacity = originalOpacity;
      const frameOpacity = getComputedStyle(printCard).opacity;
      animations.push(printCard.animate([{ opacity: 0 }, { opacity: frameOpacity }], { delay: 520 * .45, duration: 240, easing: 'ease-out', fill: 'both' }));
      const motion = clone.animate([
        boxFrame(from),
        boxFrame(to),
      ], { duration: 520, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'forwards' });
      animations.push(motion);
      await finished(motion);
      restoreTransitionPrint();
      const handoff = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: 'ease', fill: 'forwards' });
      animations.push(handoff);
      await finished(handoff);
      clone.remove(); clone = null;
      change();
    }
  } finally {
    clone?.remove();
    if (image) image.style.visibility = '';
    animations.forEach((animation) => animation.cancel());
    document.querySelector('.lb')?.classList.remove('morph-landed', 'morph-closing');
    document.documentElement.classList.remove('manual-photo-morph');
    if (!opening) restoreTransitionPrint();
  }
}
