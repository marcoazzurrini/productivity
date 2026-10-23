import type { StoreTransport } from "@productivity/gtd";
import { contextBridge, ipcRenderer } from "electron";

import { storeChannel } from "../shared/channel.ts";

const call: StoreTransport = (method, args) =>
  ipcRenderer.invoke(storeChannel, method, args);

// The renderer gets one function and nothing else from Node or Electron.
contextBridge.exposeInMainWorld("gtd", { call });
