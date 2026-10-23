import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace, Texture } from 'three';

// Letters and captions are drawn once into canvas textures (cached by content) and shown on camera-facing planes.

export interface TagTexture {
  texture: CanvasTexture;
  /** width / height of the drawn tag. */
  aspect: number;
}

export interface TextStyle {
  color?: string;
  /** Pill background (null: letters only, with a light outline for contrast). */
  bg?: string | null;
  size?: number;
}

const FONT = '"Arial Black", "Segoe UI Black", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const SUP = /^(I|X)([ABCc])$/;

/** An allele such as IA or Xc is drawn as a base letter with a small raised one. */
export function splitAllele(token: string): [string, string] {
  const m = SUP.exec(token);
  return m ? [m[1] as string, m[2] as string] : [token, ''];
}

const probeContext = (): CanvasRenderingContext2D | null => (typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'));

function make(draw: (ctx: CanvasRenderingContext2D) => void, w: number, h: number): TagTexture {
  // no DOM (unit tests in node): a blank texture with the right shape
  if (typeof document === 'undefined') return { texture: new Texture() as CanvasTexture, aspect: Math.max(8, w) / h };
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.min(1024, Math.ceil(w)));
  canvas.height = Math.ceil(h);
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

/** Alleles side by side ('A', 'a', 'IA', 'i', 'XC', 'Y' ...), e.g. ['IA', 'i'] -> I^A i. */
export function alleleTexture(alleles: readonly string[], style: TextStyle = {}): TagTexture {
  const size = style.size ?? 110;
  const sup = size * 0.66;
  const parts = alleles.map(splitAllele);
  const probe = probeContext();
  const width = (text: string, px: number): number => {
    if (!probe) return text.length * px * 0.6;
    probe.font = `900 ${px}px ${FONT}`;
    return probe.measureText(text).width;
  };
  const total = parts.reduce((s, [b, p]) => s + width(b, size) + (p ? width(p, sup) : 0) + size * 0.06, 0) + size * 0.7;
  return make(
    (ctx) => {
      ctx.textBaseline = 'alphabetic';
      if (style.bg) {
        ctx.fillStyle = style.bg;
        ctx.beginPath();
        ctx.roundRect(4, 4, ctx.canvas.width - 8, ctx.canvas.height - 8, 28);
        ctx.fill();
      }
      let x = size * 0.35;
      const base = size * 1.0;
      for (const [b, p] of parts) {
        ctx.font = `900 ${size}px ${FONT}`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = size * 0.26;
        if (!style.bg) {
          // painted lettering: soft shadow, thick cream outline, deep plum fill
          ctx.strokeStyle = 'rgba(70,40,90,0.35)';
          ctx.strokeText(b, x + size * 0.03, base + size * 0.045);
          ctx.strokeStyle = '#fff6e4';
          ctx.strokeText(b, x, base);
        }
        ctx.fillStyle = style.color ?? '#3a2350';
        ctx.fillText(b, x, base);
        x += width(b, size);
        if (p) {
          ctx.font = `900 ${sup}px ${FONT}`;
          ctx.lineWidth = sup * 0.3;
          if (!style.bg) {
            ctx.strokeStyle = 'rgba(70,40,90,0.35)';
            ctx.strokeText(p, x + size * 0.02, base - size * 0.36 + size * 0.035);
            ctx.strokeStyle = '#fff6e4';
            ctx.strokeText(p, x, base - size * 0.36);
          }
          ctx.fillText(p, x, base - size * 0.36);
          x += width(p, sup);
        }
        x += size * 0.06;
      }
    },
    total,
    size * 1.3,
  );
}

/** A caption pill ('3 : 1', 'Sarı tohum'); a line feed makes several lines. */
export function textTexture(text: string, style: TextStyle = {}): TagTexture {
  const size = style.size ?? 64;
  const lines = text.split('\n');
  const probe = probeContext();
  if (probe) probe.font = `700 ${size}px ${FONT}`;
  const widest = Math.max(...lines.map((l) => (probe ? probe.measureText(l).width : l.length * size * 0.55)));
  const lineH = size * 1.2;
  return make(
    (ctx) => {
      if (style.bg !== null) {
        ctx.fillStyle = style.bg ?? 'rgba(255,248,236,0.94)';
        ctx.beginPath();
        ctx.roundRect(3, 3, ctx.canvas.width - 6, ctx.canvas.height - 6, size * 0.5);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(80,60,90,0.35)';
        ctx.stroke();
      }
      ctx.font = `700 ${size}px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = style.color ?? '#3b2f4a';
      lines.forEach((l, i) => ctx.fillText(l, ctx.canvas.width / 2, ctx.canvas.height / 2 + (i - (lines.length - 1) / 2) * lineH + size * 0.04));
    },
    widest + size * 1.1,
    lines.length === 1 ? size * 1.45 : lineH * lines.length + size * 0.45,
  );
}

/** Round badge for the colour-vision state of a person: 'normal', 'carrier' or 'blind'. */
export function visionBadgeTexture(kind: 'normal' | 'carrier' | 'blind'): TagTexture {
  return make(
    (ctx) => {
      const r = 60;
      ctx.translate(64, 64);
      const half = (from: number, color: string): void => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, from, from + Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      };
      half(Math.PI / 2, kind === 'blind' ? '#a99f8d' : '#d6453d');
      half(-Math.PI / 2, kind === 'blind' ? '#bdb29d' : '#4fa04a');
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#fff6e6';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      if (kind === 'carrier') {
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#fff6e6';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fillStyle = '#d9822b';
        ctx.fill();
      }
      if (kind === 'blind') {
        ctx.strokeStyle = '#6b5a7a';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(-38, -38);
        ctx.lineTo(38, 38);
        ctx.stroke();
      }
    },
    128,
    128,
  );
}
