/** Schemes the app hands to the system. Anything else could launch a local app or file. */
const externalSchemes = new Set(["https:", "mailto:"]);

/** Whether a link from the window may be opened outside the app. */
export const canOpenExternally = (url: string): boolean => {
  if (!URL.canParse(url)) {
    return false;
  }

  return externalSchemes.has(new URL(url).protocol);
};
