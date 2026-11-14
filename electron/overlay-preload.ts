/** Preload of the tracker overlay: a fixed, small set of calls (src/lib/tracker/bridge.ts). */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { TRACKER_CHANNELS, type PointerPhase, type TrackerBridge } from "@/lib/tracker/bridge";
import type { TrackerView } from "@/lib/tracker/view";

const bridge: TrackerBridge = {
  onView: (cb) => {
    const listener = (_e: IpcRendererEvent, view: TrackerView) => cb(view);
    ipcRenderer.on(TRACKER_CHANNELS.view, listener);
    ipcRenderer.send(TRACKER_CHANNELS.ready);
    return () => ipcRenderer.off(TRACKER_CHANNELS.view, listener);
  },
  setInteractive: (on: boolean) => ipcRenderer.send(TRACKER_CHANNELS.interactive, on),
  drag: (phase: PointerPhase, x: number, y: number) => ipcRenderer.send(TRACKER_CHANNELS.drag, phase, x, y),
  resize: (phase: PointerPhase, x: number, y: number) => ipcRenderer.send(TRACKER_CHANNELS.resize, phase, x, y),
};
contextBridge.exposeInMainWorld("tavernTracker", bridge);
