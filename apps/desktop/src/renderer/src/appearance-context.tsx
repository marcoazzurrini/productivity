import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use } from "react";
import type { ReactNode } from "react";

import type { AppearanceBridge, Theme } from "../../shared/appearance.ts";

const AppearanceContext = createContext<AppearanceBridge | null>(null);

/** Provides the app's look. Tests pass one that keeps the theme in memory. */
export const AppearanceProvider = ({
  appearance,
  children,
}: {
  appearance: AppearanceBridge;
  children: ReactNode;
}) => <AppearanceContext value={appearance}>{children}</AppearanceContext>;

const themeKey = ["appearance", "theme"];

/**
 * The chosen theme. The colors themselves follow prefers-color-scheme,
 * which the main process sets from this choice.
 */
export const useTheme = () => {
  const appearance = use(AppearanceContext);

  if (appearance === null) {
    throw new Error("useTheme needs an AppearanceProvider above it.");
  }

  const client = useQueryClient();

  const theme = useQuery({
    queryFn: () => appearance.getTheme(),
    queryKey: themeKey,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const change = useMutation({
    mutationFn: (next: Theme) => appearance.setTheme(next),
    // Show the choice at once; the next read corrects it if saving failed.
    onMutate: (next) => {
      client.setQueryData(themeKey, next);
    },
    onSettled: () => client.invalidateQueries({ queryKey: themeKey }),
  });

  return { setTheme: change.mutate, theme: theme.data ?? "system" };
};
