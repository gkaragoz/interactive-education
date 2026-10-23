/**
 * WebGL can drop the context (GPU reset, driver update, too many tabs). `webglcontextlost` must be cancelled or the
 * browser never restores it; the owner pauses drawing until `webglcontextrestored`, then rebuilds what three.js
 * cannot re-upload by itself (the filtered environment map).
 */
export function guardContext(canvas: HTMLCanvasElement, onLost: () => void, onRestored: () => void): () => void {
  const lost = (ev: Event): void => {
    ev.preventDefault();
    onLost();
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
