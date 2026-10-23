/**
 * Floating panels fade when the learner has been idle for a few seconds; any pointer move, key press or focus
 * brings them back at once (hover and focus inside a panel keep it fully visible through CSS). Returns a cleanup.
 */
export function attachIdleFade(root: HTMLElement, delayMs = 3800): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wake = (): void => {
    root.classList.remove('idle');
    clearTimeout(timer);
    timer = setTimeout(() => root.classList.add('idle'), delayMs);
  };
  const events: (keyof HTMLElementEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'focusin', 'wheel'];
  for (const ev of events) root.addEventListener(ev, wake, { passive: true });
  wake();
  return () => {
    clearTimeout(timer);
    for (const ev of events) root.removeEventListener(ev, wake);
    root.classList.remove('idle');
  };
}
