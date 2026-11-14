/** Preload of a tracker panel window: a fixed, small set of calls (src/lib/tracker/bridge.ts). */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { TRACKER_CHANNELS, type DeckSize, type PointerPhase, type TrackerBridge, type TrackerSettings } from "@/lib/tracker/bridge";
import type { TrackerView } from "@/lib/tracker/view";

function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, listener);
  ipcRenderer.send(TRACKER_CHANNELS.ready, channel);
  return () => ipcRenderer.off(channel, listener);
}

const bridge: TrackerBridge = {
  onView: (cb) => subscribe<TrackerView>(TRACKER_CHANNELS.view, cb),
  onSettings: (cb) => subscribe<TrackerSettings>(TRACKER_CHANNELS.settings, cb),
  setInteractive: (on: boolean) => ipcRenderer.send(TRACKER_CHANNELS.interactive, on),
  drag: (phase: PointerPhase, x: number, y: number) => ipcRenderer.send(TRACKER_CHANNELS.drag, phase, x, y),
  resize: (phase: PointerPhase, x: number, y: number) => ipcRenderer.send(TRACKER_CHANNELS.resize, phase, x, y),
  hidePanel: () => ipcRenderer.send(TRACKER_CHANNELS.hide),
  setDeckSize: (size: DeckSize) => ipcRenderer.send(TRACKER_CHANNELS.deckSize, size),
};
contextBridge.exposeInMainWorld("tavernTracker", bridge);
