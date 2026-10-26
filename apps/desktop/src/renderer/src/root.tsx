import type { RemoteGtdStore } from "@productivity/gtd";
import { ToastProvider } from "@productivity/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { AppearanceBridge } from "../../shared/appearance.ts";
import type { CalendarBridge } from "../../shared/calendar.ts";
import type { JournalBridge } from "../../shared/journal.ts";
import { AppearanceProvider } from "./appearance-context.tsx";
import { CalendarProvider } from "./calendar-context.tsx";
import { JournalProvider } from "./journal-context.tsx";
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
  journal: JournalBridge;
  calendar: CalendarBridge;
  appearance: AppearanceBridge;
  /** One per app window, or per test. */
  client: QueryClient;
  initialView?: View;
  children: ReactNode;
}

/** Every provider the app needs, in dependency order. Tests use it too. */
export const Root = ({
  store,
  journal,
  calendar,
  appearance,
  client,
  initialView,
  children,
}: RootProps) => (
  <QueryClientProvider client={client}>
    <AppearanceProvider appearance={appearance}>
      <StoreProvider store={store}>
        <CalendarProvider bridge={calendar}>
          <JournalProvider journal={journal}>
            <NavigationProvider initial={initialView}>
              <ToastProvider>
                <TaskDialogProvider>
                  <QuickCaptureProvider>{children}</QuickCaptureProvider>
                </TaskDialogProvider>
              </ToastProvider>
            </NavigationProvider>
          </JournalProvider>
        </CalendarProvider>
      </StoreProvider>
    </AppearanceProvider>
  </QueryClientProvider>
);
