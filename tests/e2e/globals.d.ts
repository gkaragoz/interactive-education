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

interface Window {
  __bilim: BilimDebug;
  __bilimModules?: BilimModulesHost;
}
