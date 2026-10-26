/** Follow macOS, or always show one theme. */
export type Theme = "system" | "light" | "dark";

export const themes: readonly Theme[] = ["system", "light", "dark"];

export const isTheme = (value: unknown): value is Theme =>
  themes.some((theme) => theme === value);

/** The IPC channels for the app's look, one per operation. */
export const appearanceChannel = {
  getTheme: "appearance:get-theme",
  setTheme: "appearance:set-theme",
} as const;

/** What the preload script gives the renderer for the app's look. */
export interface AppearanceBridge {
  getTheme: () => Promise<Theme>;
  /** Saves the choice and repaints every window, native chrome included. */
  setTheme: (theme: Theme) => Promise<void>;
}
