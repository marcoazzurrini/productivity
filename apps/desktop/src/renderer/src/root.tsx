import type { RemoteGtdStore } from "@productivity/gtd";
import { ToastProvider } from "@productivity/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { AgentBridge } from "../../shared/agent.ts";
import type { AppearanceBridge } from "../../shared/appearance.ts";
import type { CalendarBridge } from "../../shared/calendar.ts";
import type { JournalBridge } from "../../shared/journal.ts";
import { AgentProvider } from "./agent-context.tsx";
import { AppearanceProvider } from "./appearance-context.tsx";
import { CalendarProvider } from "./calendar-context.tsx";
import { CommandProvider } from "./commands.tsx";
import { JournalProvider } from "./journal-context.tsx";
import { NavigationProvider } from "./navigation.tsx";
import type { View } from "./navigation.tsx";
import { NewProjectProvider } from "./new-project-dialog.tsx";
import { QuickCaptureProvider } from "./quick-capture.tsx";
import { QuickFindProvider } from "./quick-find.tsx";
import { SelectionProvider } from "./selection.tsx";
import { StoreProvider } from "./store-context.tsx";
import { TaskDialogProvider } from "./task-dialog.tsx";
import { WeekPaneProvider } from "./week-pane.tsx";

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
  agent: AgentBridge;
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
  agent,
  client,
  initialView,
  children,
}: RootProps) => (
  <QueryClientProvider client={client}>
    <AppearanceProvider appearance={appearance}>
      <StoreProvider store={store}>
        <CalendarProvider bridge={calendar}>
          <JournalProvider journal={journal}>
            <AgentProvider bridge={agent}>
              {/* Navigation clears the selection, so it sits inside it. */}
              <SelectionProvider>
                <NavigationProvider initial={initialView}>
                  <ToastProvider>
                    <WeekPaneProvider>
                      <CommandProvider>
                        <TaskDialogProvider>
                          <QuickCaptureProvider>
                            <NewProjectProvider>
                              <QuickFindProvider>{children}</QuickFindProvider>
                            </NewProjectProvider>
                          </QuickCaptureProvider>
                        </TaskDialogProvider>
                      </CommandProvider>
                    </WeekPaneProvider>
                  </ToastProvider>
                </NavigationProvider>
              </SelectionProvider>
            </AgentProvider>
          </JournalProvider>
        </CalendarProvider>
      </StoreProvider>
    </AppearanceProvider>
  </QueryClientProvider>
);
