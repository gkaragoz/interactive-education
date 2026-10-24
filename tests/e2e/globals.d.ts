// One shared declaration of the debug globals the app exposes (dev, ?perf and ?demo); every e2e spec relies on it.
interface BilimDebugStage {
  screenshot(): Promise<Blob | null>;
  qualityLevel: string;
  debug: { cameraPosition(): [number, number, number]; screenPointOf(id: string): { x: number; y: number } | null };
}

interface BilimDebug {
  stage: BilimDebugStage;
  store: { get(): { selectedId: string | null; cutPosition: number; viewMode: string; cellId: string; level: string; compareOn: boolean } };
  catalog: { data: { sources: unknown[]; micrographs: unknown[]; kazanimlar: unknown[] } };
}

/** `window.__bilimModules`: the ModuleHost of the open animated module. */
interface BilimModulesHost {
  session: {
    player: { time: number; playing: boolean; seek(t: number): void; play(): void; pause(): void };
    track: { id: string; duration: number };
  };
  stage: {
    screenshot(): Promise<Blob | null>;
    moduleScene: {
      labelsAt(t: number): { text: string; anchorId?: string }[];
      chartAt(t: number): Record<string, number>;
    };
  };
}

/** `window.__bilimSim`: the SimHost of the open sim module (chemistry lab). */
interface BilimSimHost {
  scene: {
    lab: { journal: { textTr: string }[]; vessel(id: string): { mix: Record<string, number> } | undefined; vesselIds(): string[] };
    root: { traverse(f: (o: BilimSimObject) => void): void };
    pointer?: (ev: { type: string; dragId: string | null; hit: { id: string } | null }) => void;
  };
  simStage: { clock: { simTime: number; paused: boolean; speed: number }; stage: { camera: BilimCamera; canvas: HTMLCanvasElement } };
}
interface BilimCamera {
  matrixWorldInverse: { elements: number[] };
  projectionMatrix: { elements: number[] };
}
interface BilimSimObject {
  userData: Record<string, unknown>;
  getWorldPosition(target: unknown): unknown;
}

interface Window {
  __bilimSim?: BilimSimHost;
  __bilim: BilimDebug;
  __bilimModules?: BilimModulesHost;
}
