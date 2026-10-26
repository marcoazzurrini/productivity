import { createRemoteCalendar } from "@productivity/calendar";
import type { RemoteCalendar } from "@productivity/calendar";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import type { CalendarBridge } from "../../shared/calendar.ts";

const CalendarContext = createContext<RemoteCalendar | null>(null);

/**
 * Provides the calendar client, and refetches calendar data whenever a
 * sync in the main process changes it. Tests pass an in-memory bridge.
 */
export const CalendarProvider = ({
  bridge,
  children,
}: {
  bridge: CalendarBridge;
  children: ReactNode;
}) => {
  const client = useQueryClient();
  const calendar = useMemo(() => createRemoteCalendar(bridge.call), [bridge]);

  useEffect(
    () =>
      bridge.onChanged(() => {
        void client.invalidateQueries({ queryKey: ["calendar"] });
      }),
    [bridge, client]
  );

  return <CalendarContext value={calendar}>{children}</CalendarContext>;
};

export const useCalendar = (): RemoteCalendar => {
  const calendar = use(CalendarContext);

  if (calendar === null) {
    throw new Error("useCalendar needs a CalendarProvider above it.");
  }

  return calendar;
};
