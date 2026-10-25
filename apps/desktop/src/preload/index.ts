import type { StoreTransport } from "@productivity/gtd";
import { contextBridge, ipcRenderer } from "electron";

import { storeChannel } from "../shared/channel.ts";
import { journalChannel } from "../shared/journal.ts";
import type { JournalBridge } from "../shared/journal.ts";

const call: StoreTransport = (method, args) =>
  ipcRenderer.invoke(storeChannel, method, args);

const journal: JournalBridge = {
  read: (day) => ipcRenderer.invoke(journalChannel.read, day),
  write: (day, markdown) =>
    ipcRenderer.invoke(journalChannel.write, day, markdown),
  writeNow: (day, markdown) => {
    ipcRenderer.sendSync(journalChannel.writeNow, day, markdown);
  },
};

// The renderer gets these functions and nothing else from Node or Electron.
contextBridge.exposeInMainWorld("gtd", { call });

contextBridge.exposeInMainWorld("journal", journal);
