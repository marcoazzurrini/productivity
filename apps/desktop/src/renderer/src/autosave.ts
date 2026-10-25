export type SaveStatus = "saved" | "saving" | "failed";

/** Saves this long after the last keystroke. */
export const saveDelay = 400;

/** Tries again this long after a failed save. */
export const retryDelay = 2000;

export interface Autosave {
  /** Records new text and saves it once typing pauses. */
  change: (text: string) => void;
  /** Saves any unsaved text now. Resolves when every save has finished. */
  flush: () => Promise<void>;
  /**
   * Stops saving and returns the unsaved text, or null if there is none.
   * For the moment the window closes, when only a blocking save is safe.
   */
  takeUnsaved: () => string | null;
}

/**
 * Saves text in the background: after a pause in typing, on demand, and
 * again after a failure. Saves run one at a time, in order, and always send
 * the whole text, so the last one written is the latest.
 */
export const createAutosave = (
  save: (text: string) => Promise<void>,
  onStatus: (status: SaveStatus) => void
): Autosave => {
  let unsaved: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saving: Promise<boolean> = Promise.resolve(true);

  const schedule = (delay: number, run: () => void): void => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };

  /** Saves one version of the text. Resolves to whether it worked. */
  const run = async (text: string): Promise<boolean> => {
    try {
      await save(text);

      if (unsaved === null) {
        onStatus("saved");
      }

      return true;
    } catch {
      // Keep newer text if the user typed while this save was failing.
      unsaved ??= text;
      onStatus("failed");

      return false;
    }
  };

  const flush = async (): Promise<void> => {
    clearTimeout(timer);

    if (unsaved !== null) {
      const text = unsaved;

      unsaved = null;
      saving = saving
        .then(() => run(text))
        .then((saved) => {
          if (!saved) {
            schedule(retryDelay, () => {
              void flush();
            });
          }

          return saved;
        });
    }

    await saving;
  };

  return {
    change: (text) => {
      unsaved = text;
      onStatus("saving");
      schedule(saveDelay, () => {
        void flush();
      });
    },
    flush,
    takeUnsaved: () => {
      clearTimeout(timer);

      const text = unsaved;

      unsaved = null;

      return text;
    },
  };
};
