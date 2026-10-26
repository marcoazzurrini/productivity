import type { StoreTransport } from "@productivity/gtd";
import { contextBridge, ipcRenderer } from "electron";

import { calendarChannel } from "../shared/calendar.ts";
import type { CalendarBridge } from "../shared/calendar.ts";
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

const calendar: CalendarBridge = {
  call: (method, args) =>
    ipcRenderer.invoke(calendarChannel.call, method, args),
  onChanged: (listener) => {
    const forward = (): void => {
      listener();
    };

    ipcRenderer.on(calendarChannel.changed, forward);

    return () => {
      ipcRenderer.off(calendarChannel.changed, forward);
    };
  },
};

// The renderer gets these functions and nothing else from Node or Electron.
contextBridge.exposeInMainWorld("gtd", { call });

contextBridge.exposeInMainWorld("journal", journal);

contextBridge.exposeInMainWorld("calendar", calendar);
