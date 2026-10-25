import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAutosave,
  retryDelay,
  saveDelay,
} from "../src/renderer/src/autosave.ts";
import type { SaveStatus } from "../src/renderer/src/autosave.ts";

type Save = (text: string) => Promise<void>;

const setup = (save = vi.fn<Save>(async () => {})) => {
  const statuses: SaveStatus[] = [];

  const autosave = createAutosave(save, (status) => {
    statuses.push(status);
  });

  return { autosave, save, statuses };
};

describe(createAutosave, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves once typing pauses, with the latest text", async () => {
    const { autosave, save, statuses } = setup();

    autosave.change("H");
    autosave.change("Hi");
    await vi.advanceTimersByTimeAsync(saveDelay - 1);

    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(save.mock.calls).toStrictEqual([["Hi"]]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("saves at once when flushed, and only once", async () => {
    const { autosave, save } = setup();

    autosave.change("Before leaving");
    await autosave.flush();
    await vi.advanceTimersByTimeAsync(saveDelay * 2);

    expect(save.mock.calls).toStrictEqual([["Before leaving"]]);
  });

  it("starts a save only after the one before it finished", async () => {
    const slow = Promise.withResolvers<undefined>();
    const events: string[] = [];

    const { autosave } = setup(
      vi.fn<Save>(async (text) => {
        events.push(`start ${text}`);

        if (text === "first") {
          await slow.promise;
        }

        events.push(`end ${text}`);
      })
    );

    autosave.change("first");
    const first = autosave.flush();

    autosave.change("second");
    const second = autosave.flush();

    await vi.advanceTimersByTimeAsync(0);
    slow.resolve(undefined);
    await Promise.all([first, second]);

    expect(events).toStrictEqual([
      "start first",
      "end first",
      "start second",
      "end second",
    ]);
  });

  it("tries again after a failure", async () => {
    const save = vi
      .fn<Save>(async () => {})
      .mockRejectedValueOnce(new Error("disk full"));

    const { autosave, statuses } = setup(save);

    autosave.change("Draft");
    await vi.advanceTimersByTimeAsync(saveDelay);

    expect(statuses.at(-1)).toBe("failed");

    await vi.advanceTimersByTimeAsync(retryDelay);

    expect(save.mock.calls).toStrictEqual([["Draft"], ["Draft"]]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("hands over unsaved text for a blocking save, then stops", async () => {
    const { autosave, save } = setup();

    autosave.change("Typed just before quitting");

    expect(autosave.takeUnsaved()).toBe("Typed just before quitting");
    expect(autosave.takeUnsaved()).toBeNull();

    await vi.advanceTimersByTimeAsync(saveDelay * 2);

    expect(save).not.toHaveBeenCalled();
  });
});
