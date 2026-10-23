import type { RemoteGtdStore } from "@productivity/gtd";
import { ToastProvider } from "@productivity/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { NavigationProvider } from "./navigation.tsx";
import type { View } from "./navigation.tsx";
import { QuickCaptureProvider } from "./quick-capture.tsx";
import { StoreProvider } from "./store-context.tsx";
import { TaskDialogProvider } from "./task-dialog.tsx";

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: true, staleTime: 5000 },
    },
  });

export interface RootProps {
  store: RemoteGtdStore;
  /** One per app window, or per test. */
  client: QueryClient;
  initialView?: View;
  children: ReactNode;
}

/** Every provider the app needs, in dependency order. Tests use it too. */
export const Root = ({ store, client, initialView, children }: RootProps) => (
  <QueryClientProvider client={client}>
    <StoreProvider store={store}>
      <NavigationProvider initial={initialView}>
        <ToastProvider>
          <TaskDialogProvider>
            <QuickCaptureProvider>{children}</QuickCaptureProvider>
          </TaskDialogProvider>
        </ToastProvider>
      </NavigationProvider>
    </StoreProvider>
  </QueryClientProvider>
);
