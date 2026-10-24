import { Box3, CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace, Vector3, type PerspectiveCamera } from 'three';

export type LegendId = 'co2' | 'o2' | 'h2o' | 'glucose' | 'atp';

const NAMES: Record<LegendId, string> = { co2: 'CO₂', o2: 'O₂', h2o: 'Su', glucose: 'Glikoz', atp: 'ATP' };
const W = 760;
const H = 84;

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(60,40,20,0.35)';
  g.stroke();
}

/** Little pictures of the molecule models in their colours (grey carbon with red oxygen, blue water, amber hexagon, gold coin). */
function icon(g: CanvasRenderingContext2D, id: LegendId, cx: number, cy: number): void {
  if (id === 'co2') {
    dot(g, cx - 26, cy, 11, '#e0483e');
    dot(g, cx + 26, cy, 11, '#e0483e');
    dot(g, cx, cy, 14, '#6b6f7a');
  } else if (id === 'o2') {
    dot(g, cx - 14, cy, 17, '#e0483e');
    dot(g, cx + 14, cy, 17, '#e0483e');
  } else if (id === 'h2o') {
    dot(g, cx - 16, cy + 12, 8, '#e3f3fb');
    dot(g, cx + 16, cy + 12, 8, '#e3f3fb');
    dot(g, cx, cy - 4, 15, '#4aa3df');
  } else if (id === 'glucose') {
    g.beginPath();
    for (let i = 0; i < 6; i++) g.lineTo(cx + Math.cos((i / 6) * Math.PI * 2) * 22, cy + Math.sin((i / 6) * Math.PI * 2) * 22);
    g.closePath();
    g.fillStyle = '#e8a526';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#b97f12';
    g.stroke();
  } else {
    dot(g, cx, cy, 21, '#f6c744');
    g.lineWidth = 4;
    g.strokeStyle = '#d99a1e';
    g.beginPath();
    g.arc(cx, cy, 21, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 3; i++) dot(g, cx + Math.cos((i / 3) * Math.PI * 2 + 1.57) * 8, cy + Math.sin((i / 3) * Math.PI * 2 + 1.57) * 8, 3.5, '#d99a1e');
  }
}

export interface Legend {
  sprite: Sprite;
  dispose(): void;
}

/**
 * A small molecule-colour key that stays at a fixed place on screen (the sprite re-anchors itself to whatever camera draws it).
 * It carries no bounds, so it does not change how the stage frames the scene.
 */
export function createLegend(ids: readonly LegendId[]): Legend | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (g) {
    g.fillStyle = 'rgba(251,246,233,0.9)';
    g.strokeStyle = 'rgba(120,90,50,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 30);
    g.fill();
    g.stroke();
    const cell = (W - 24) / ids.length;
    g.font = '600 26px Georgia, serif';
    ids.forEach((id, i) => {
      const x = 12 + i * cell;
      g.save();
      g.translate(x + 34, H / 2);
      g.scale(0.72, 0.72);
      icon(g, id, 0, 0);
      g.restore();
      g.fillStyle = '#3d3224';
      g.fillText(NAMES[id], x + 58, H / 2 + 10);
    });
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const sprite = new Sprite(material);
  sprite.name = 'molecule-legend';
  const geo = sprite.geometry.clone();
  geo.boundingBox = new Box3();
  sprite.geometry = geo;
  sprite.frustumCulled = false;
  sprite.renderOrder = 998;
  const f = new Vector3();
  const r = new Vector3();
  const u = new Vector3();
  const D = 10;
  sprite.onBeforeRender = (_renderer, _scene, camera): void => {
    const cam = camera as PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    cam.getWorldDirection(f);
    r.setFromMatrixColumn(cam.matrixWorld, 0);
    u.setFromMatrixColumn(cam.matrixWorld, 1);
    const halfH = D * Math.tan((cam.fov * Math.PI) / 360);
    const halfW = halfH * cam.aspect;
    const h = halfH * 0.15;
    const w = (h * W) / H;
    sprite.scale.set(w, h, 1);
    sprite.position.copy(cam.position).addScaledVector(f, D).addScaledVector(r, halfW * 0.3).addScaledVector(u, -halfH * 0.62);
    sprite.updateMatrixWorld(true);
  };
  return { sprite, dispose: () => (texture.dispose(), material.dispose(), geo.dispose(), sprite.removeFromParent()) };
}
