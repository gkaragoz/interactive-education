import type { CameraRig } from './cameraRig';
import type { CellScene } from './cellScene';
import type { LabelLayer } from './labels';
import type { PaneSet } from './paneSet';
import { chooseFocusIndex, focusCamera } from './stageFocus';
import type { ViewState } from './stageTypes';

export const INITIAL_VIEW: ViewState = { selectedId: null, hidden: new Set(), viewMode: 'cutaway', hideOthers: false, cutPosition: 0.4, labels: false, autoRotate: false };

export interface ViewHost {
  labels: LabelLayer;
  paneSet: PaneSet;
  rig: CameraRig;
  scenes(): { primary: CellScene | null; secondary: CellScene | null };
  requestRender(): void;
}

/** Applies the UI's view state (selection, hide, cut, labels, auto-rotate) to the scenes, panes and camera. */
export class StageView {
  view: ViewState = INITIAL_VIEW;
  /** Instance of the selected organelle that is tinted, isolated and focused. */
  focusIndex: number | null = null;
  /** The instance under the last click; used when the click selected that organelle. */
  clickPick: { id: string; index: number } | null = null;

  constructor(private readonly host: ViewHost) {}

  apply(view: ViewState): void {
    const { rig, scenes } = this.host;
    const selectionChanged = view.selectedId !== this.view.selectedId;
    const refocus = selectionChanged || (view.viewMode === 'isolate') !== (this.view.viewMode === 'isolate');
    this.view = view;
    if (selectionChanged) {
      this.focusIndex = chooseFocusIndex(scenes().primary, rig.camera.position, view.selectedId, this.clickPick);
      this.clickPick = null;
    }
    this.applyToScenes();
    rig.setAutoRotate(view.autoRotate);
    // With a selection the picture slides left and up a little, out from under the view-mode panel and the toolbars.
    const framed = view.selectedId !== null && !this.host.paneSet.isCompare;
    rig.setShift(framed ? 0.1 : 0, framed ? 0.025 : 0);
    if (refocus) focusCamera(scenes().primary, rig, view.selectedId, this.focusIndex, view.viewMode === 'isolate');
  }

  applyToScenes(): void {
    const v = this.view;
    const { primary, secondary } = this.host.scenes();
    this.host.labels.setEnabled(v.labels && !this.host.paneSet.isCompare);
    this.host.paneSet.setBackdropTone(v.viewMode === 'isolate' ? 1 : 0);
    for (const scene of [primary, secondary]) {
      if (!scene) continue;
      scene.applyVisibility({
        hidden: v.hidden,
        isolateId: v.viewMode === 'isolate' ? v.selectedId : null,
        hideOthersId: v.hideOthers ? v.selectedId : null,
        selectedId: v.selectedId,
        focusIndex: scene === primary ? this.focusIndex : null,
      });
      scene.setCut(v.cutPosition, v.viewMode === 'cutaway');
    }
    this.host.requestRender();
  }
}
