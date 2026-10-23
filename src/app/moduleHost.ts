import { ModuleSession, type QualityName } from '../core';
import type { LevelId } from '../data/types';
import type { RegistryEntry } from '../modules';
import { ModuleAssets, ModuleStage, seededRng, type ModuleContext, type ModuleScene } from '../scene';
import type { ModuleView } from '../ui';
import { Plane, Vector3 } from 'three';

export interface ModuleHostDeps {
  view: ModuleView;
  baseUrl: string;
  quality: () => QualityName;
  reducedMotion: boolean;
  toast(text: string): void;
  /** The route changes when the learner picks another track. */
  navigateTrack(moduleId: string, trackId: string): void;
}

/** Opens one animated module: loads its chunk, builds the scene, wires session, stage and the module view together. */
export class ModuleHost {
  session: ModuleSession | null = null;
  stage: ModuleStage | null = null;
  private assets: ModuleAssets | null = null;
  private token = 0;
  private unsubscribe: (() => void) | null = null;
  private key = '';

  constructor(private readonly deps: ModuleHostDeps) {}

  /** Opens (or re-opens after a level or track change) a module; the same arguments twice do nothing. */
  async open(entry: RegistryEntry, trackId: string | null, level: LevelId): Promise<void> {
    const key = `${entry.id}|${trackId ?? ''}|${level}`;
    if (key === this.key && this.session) return;
    // Changing only the level (or a track that is not offered at the new level) keeps the playhead where it was.
    const carry = this.session && this.session.info.id === entry.id ? { time: this.session.player.time, track: this.session.track.id, playing: this.session.player.playing } : null;
    this.close();
    this.key = key;
    const token = ++this.token;
    const { view } = this.deps;
    view.setLoading('Modül hazırlanıyor…');
    if (!entry.definition) return;
    const { info, createScene } = await entry.definition.load();
    if (token !== this.token) return;
    const session = new ModuleSession(info, trackId ?? carry?.track ?? '', level, this.deps.reducedMotion);
    const stage = new ModuleStage({ container: view.viewport, quality: this.deps.quality(), reducedMotion: this.deps.reducedMotion });
    const assets = new ModuleAssets(this.deps.baseUrl, this.deps.quality(), stage.normalMap, new Plane(new Vector3(0, -1, 0), 1e5), () => this.deps.toast('Bazı modeller yüklenemedi; basit şekiller gösteriliyor.'));
    const options = Object.fromEntries(info.options.map((o) => [o.id, o.defaultChoice]));
    const ctx: ModuleContext = { assets, quality: this.deps.quality(), level, reducedMotion: this.deps.reducedMotion, trackId: session.track.id, options, rng: seededRng };
    let scene: ModuleScene;
    try {
      scene = await createScene(ctx);
    } catch (error) {
      stage.dispose();
      assets.dispose();
      view.setLoading('Modül yüklenemedi.');
      throw error;
    }
    if (token !== this.token) {
      scene.dispose();
      stage.dispose();
      assets.dispose();
      return;
    }
    this.session = session;
    this.stage = stage;
    this.assets = assets;
    stage.setScene(scene);
    stage.onFrame = (dt) => {
      session.tick(dt);
    };
    // The scene is only ever posed from the player's time.
    this.unsubscribe = session.player.subscribe(() => {
      stage.playing = session.player.playing;
      stage.setTime(session.player.time);
    });
    view.bind(info, session, options, {
      selectTrack: (id) => this.deps.navigateTrack(info.id, id),
      setOption: (id, choice) => {
        options[id] = choice;
        scene.setOptions?.({ ...options });
        stage.setTime(session.player.time);
      },
      preset: (preset) => (preset === 'auto' ? stage.followCamera() : stage.setPreset(preset)),
      labels: (on) => stage.setLabelsEnabled(on),
      safeArea: (insets) => stage.setSafeInsets(insets.left, insets.right, insets.top, insets.bottom),
      seek: (t) => {
        session.rewound(t);
        session.player.seek(t);
      },
      values: (t) => ({ ...session.chartValues(t), ...(scene.chartAt?.(t) ?? {}) }),
      screenshot: () => {
        void stage.screenshot().then((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bilim-atolyesi-${info.id}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        });
      },
    });
    if (carry && carry.track === session.track.id) session.player.seek(Math.min(carry.time, session.track.duration));
    view.setLoading(null);
    stage.setTime(session.player.time);
    if (carry?.playing && carry.track === session.track.id) session.player.play();
    document.body.dataset.moduleReady = info.id;
  }

  close(): void {
    this.token++;
    this.key = '';
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.stage?.dispose();
    this.assets?.dispose();
    this.stage = null;
    this.assets = null;
    this.session = null;
    this.deps.view.dispose();
    delete document.body.dataset.moduleReady;
  }
}
