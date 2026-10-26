/** Variables electron-vite builds into the main process. */
interface ImportMetaEnv {
  /** From apps/desktop/.env.local. See the README's Google Calendar section. */
  readonly MAIN_VITE_GOOGLE_CLIENT_ID?: string;
  readonly MAIN_VITE_GOOGLE_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
