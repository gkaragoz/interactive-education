export interface InputHandlers {
  /** Organelle (or shell part) id under a client position, or null. */
  pick(clientX: number, clientY: number): string | null;
  hover(id: string | null): void;
  /** Click on an id or on empty space (null). */
  click(id: string | null, clientX: number, clientY: number): void;
  /** Returns true when the key was used. */
  key(ev: KeyboardEvent): boolean;
  invalidate(): void;
}

const CLICK_SLOP_PX = 5;

/** Pointer and keyboard input on the canvas: hover, click-versus-drag, keyboard navigation. */
export class StageInput {
  hoverId: string | null = null;
  private downAt: { x: number; y: number } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: InputHandlers,
  ) {
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('keydown', this.onKey);
  }

  private setHover(id: string | null): void {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.canvas.style.cursor = id ? 'pointer' : 'grab';
    this.handlers.hover(id);
    this.handlers.invalidate();
  }

  private readonly onMove = (ev: PointerEvent): void => {
    if (ev.buttons === 0) this.setHover(this.handlers.pick(ev.clientX, ev.clientY));
  };

  private readonly onLeave = (): void => this.setHover(null);

  private readonly onDown = (ev: PointerEvent): void => {
    this.downAt = { x: ev.clientX, y: ev.clientY };
  };

  private readonly onUp = (ev: PointerEvent): void => {
    const down = this.downAt;
    this.downAt = null;
    if (!down || ev.button !== 0 || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > CLICK_SLOP_PX) return;
    this.handlers.click(this.handlers.pick(ev.clientX, ev.clientY), ev.clientX, ev.clientY);
  };

  private readonly onKey = (ev: KeyboardEvent): void => {
    if (this.handlers.key(ev)) {
      ev.preventDefault();
      this.handlers.invalidate();
    }
  };

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.canvas.removeEventListener('keydown', this.onKey);
  }
}
