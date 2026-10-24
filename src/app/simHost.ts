import { Plane, Vector3 } from 'three';
import { getExperiment } from '../chemlab';
import { loadLabLast, loadLabSafetySeen, loadSoftFlash, saveSoftFlash, type QualityName } from '../core';
import type { LevelId } from '../data/types';
import type { RegistryEntry } from '../modules';
import { ModuleAssets, seededRng, SimStage, type LabSimScene, type SimContext } from '../scene';
import type { LabView } from '../ui';
import { experimentList } from '../scene';

export interface SimHostDeps {
  view: LabView;
  baseUrl: string;
  quality: () => QualityName;
  reducedMotion: boolean;
  toast(text: string): void;
  /** The address changes when the learner picks another experiment (no reload: the host already switched). */
  navigate(moduleId: string, experimentSlug: string): void;
}

/** Route slug of the free bench. */
export const FREE_SLUG = 'serbest';

/** Opens one sim module: loads its chunk, builds the sim scene and wires SimStage, engine and lab view together. */
export class SimHost {
  simStage: SimStage | null = null;
  scene: LabSimScene | null = null;
  private assets: ModuleAssets | null = null;
  private token = 0;
  private key = '';
  private questionsOn = true;
  private softFlash = loadSoftFlash();
  private experimentId: string | null = null;
  private explainerFactory: ((scriptId: string) => Promise<import('../scene').ModuleScene>) | null = null;

  constructor(private readonly deps: SimHostDeps) {}

  /** `experimentSlug`: null = the first experiment, 'serbest' = free bench, else an experiment id. */
  async open(entry: RegistryEntry, experimentSlug: string | null, level: LevelId): Promise<void> {
    if (!entry.sim) return;
    // No slug: resume the remembered choice (first run: experiment 1 behind the start card).
    const last = loadLabLast();
    const slug = experimentSlug ?? last;
    const experimentId = slug === FREE_SLUG ? null : getExperiment(slug ?? '') ? slug : (experimentList()[0]?.id ?? null);
    const intro = { firstVisit: !loadLabSafetySeen(), startCard: experimentSlug === null && last === null, last };
    const key = `${entry.id}|${experimentId ?? FREE_SLUG}|${level}`;
    if (key === this.key && this.scene) return;
    this.close();
    this.key = key;
    this.experimentId = experimentId;
    const token = ++this.token;
    const { view } = this.deps;
    view.setLoading('Laboratuvar hazırlanıyor…');
    const def = await entry.sim.load();
    if (token !== this.token) return;
    const simStage = new SimStage({ container: view.viewport, quality: this.deps.quality(), reducedMotion: this.deps.reducedMotion });
    const assets = new ModuleAssets(this.deps.baseUrl, this.deps.quality(), simStage.stage.normalMap, new Plane(new Vector3(0, -1, 0), 1e5), () => this.deps.toast('Bazı modeller yüklenemedi; basit şekiller gösteriliyor.'));
    assets.enableTextures(simStage.stage.renderer, () => simStage.stage.requestRender());
    const ctx: SimContext = { assets, quality: this.deps.quality(), level, reducedMotion: this.deps.reducedMotion, rng: seededRng, experimentId, softFlash: this.softFlash };
    let scene: LabSimScene;
    try {
      const created = await def.createSim(ctx);
      if (!('lab' in created)) throw new Error('chem-lab sim must provide .lab');
      scene = created as LabSimScene;
    } catch (error) {
      simStage.dispose();
      assets.dispose();
      view.setLoading('Laboratuvar yüklenemedi.');
      throw error;
    }
    if (token !== this.token) {
      scene.dispose();
      simStage.dispose();
      assets.dispose();
      return;
    }
    this.simStage = simStage;
    this.scene = scene;
    this.assets = assets;
    const explainer = def.createExplainer;
    this.explainerFactory = explainer ? (id) => explainer(ctx, id) : null;
    simStage.setSim(scene);
    simStage.onStep = () => view.refresh();
    simStage.onTick = (dt) => view.tick(dt);
    view.bind(def.info, scene, {
      setSpeed: (f) => simStage.setSpeed(f),
      setPaused: (p) => simStage.setPaused(p),
      loadExperiment: (id) => {
        scene.loadExperiment(id);
        this.experimentId = id;
        simStage.restarted();
        this.key = `${entry.id}|${id ?? FREE_SLUG}|${level}`;
        this.deps.navigate(entry.id, id ?? FREE_SLUG);
      },
      reset: () => {
        scene.reset();
        simStage.restarted();
      },
      replayTo: (t) => {
        simStage.replayTo(t);
        view.refresh();
      },
      checkpoint: () => simStage.checkpoint(),
      explain: (scriptId) => {
        const make = this.explainerFactory;
        if (!make) return;
        void make(scriptId).then((s) => simStage.showExplainer(s)).catch(() => this.deps.toast('Açıklama sahnesi yüklenemedi.'));
      },
      explainSeek: (t) => {
        if (simStage.showingExplainer) simStage.stage.setTime(t);
      },
      explainClose: () => simStage.showExplainer(null),
      preset: (p) => simStage.stage.setPreset(p),
      focusItem: (id) => simStage.focusItem(id),
      labelMode: (m) => simStage.setLabelMode(m),
      itemFocus: (id) => simStage.setFocusId(id),
      softFlash: (on) => {
        this.softFlash = on;
        saveSoftFlash(on);
        scene.setSoftFlash?.(on);
      },
      screenshot: () => {
        void simStage.stage.screenshot().then((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bilim-atolyesi-${entry.id}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        });
      },
      toast: (text) => this.deps.toast(text),
      safeArea: (i) => simStage.stage.setSafeInsets(i.left, i.right, i.top, i.bottom),
    }, { level, experimentId, softFlash: this.softFlash, timeline: def.timeline ?? null, intro });
    scene.setSoftFlash?.(this.softFlash);
    view.setQuestions(this.questionsOn);
    if (!new URLSearchParams(location.search).has('noprewarm')) {
      await simStage.stage.prewarm(1);
      if (token !== this.token) return;
    }
    view.setLoading(null);
    view.refresh();
    document.body.dataset.moduleReady = entry.id;
  }

  /** Experiment ids in the order of the list (dev, perf and e2e helpers). */
  experimentIds(): string[] {
    return experimentList().map((e) => e.id);
  }

  /** Plays the reference solution of the open experiment through the engine (perf runs and demos); false in the free bench. */
  runSolution(): boolean {
    const exp = this.experimentId ? getExperiment(this.experimentId) : undefined;
    if (!exp || !this.scene) return false;
    this.scene.lab.runScript(exp.solution);
    this.simStage?.checkpoint();
    return true;
  }

  /** Sorular setting: the lab view only needs the flag (prompts after steps). */
  setQuestions(on: boolean): void {
    this.questionsOn = on;
    this.deps.view.setQuestions(on);
  }

  close(): void {
    this.token++;
    this.key = '';
    this.simStage?.dispose();
    this.assets?.dispose();
    this.simStage = null;
    this.assets = null;
    this.scene = null;
    this.explainerFactory = null;
    this.deps.view.dispose();
    delete document.body.dataset.moduleReady;
  }
}
