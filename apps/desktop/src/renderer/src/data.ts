import type { RemoteCalendar } from "@productivity/calendar";
import type { LocalDate, RemoteGtdStore } from "@productivity/gtd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCalendar } from "./calendar-context.tsx";
import { useStore } from "./store-context.tsx";

/**
 * Read hooks, one per store query. Every write invalidates all of them: the
 * data is small and local, so refetching is cheap and never stale.
 */
const useRead = <Result>(
  key: readonly (string | null)[],
  fetch: (store: RemoteGtdStore) => Promise<Result>
) => {
  const store = useStore();

  return useQuery({ queryFn: () => fetch(store), queryKey: key });
};

export const useOverview = () =>
  useRead(["overview"], (store) => store.overview());

export const useInbox = () => useRead(["inbox"], (store) => store.listInbox());

export const useNextActions = () =>
  useRead(["next"], (store) => store.listNextActions());

export const useUpcoming = () =>
  useRead(["upcoming"], (store) => store.listUpcoming());

export const useWaiting = () =>
  useRead(["waiting"], (store) => store.listWaiting());

export const useSomeday = () =>
  useRead(["someday"], (store) => store.listSomeday());

export const useContexts = () =>
  useRead(["contexts"], (store) => store.listContexts());

export const useAreas = () => useRead(["areas"], (store) => store.listAreas());

export const useProjects = () =>
  useRead(["projects"], (store) => store.listProjects());

export const useProject = (projectId: string) =>
  useRead(["project", projectId], (store) => store.getProject(projectId));

export const useWeek = (day: LocalDate) =>
  useRead(["week", day], (store) => store.getWeek(day));

export const useReview = () =>
  useRead(["review"], (store) => store.getReview());

/** Runs a write against the store, then refreshes every list. */
export const useStoreAction = <Input, Result>(
  action: (store: RemoteGtdStore, input: Input) => Promise<Result>
) => {
  const store = useStore();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Input) => action(store, input),
    onSettled: () => client.invalidateQueries(),
  });
};

const useCalendarRead = <Result>(
  key: readonly string[],
  fetch: (calendar: RemoteCalendar) => Promise<Result>
) => {
  const calendar = useCalendar();

  return useQuery({
    queryFn: () => fetch(calendar),
    queryKey: ["calendar", ...key],
  });
};

/** Events that overlap the days [from, to). */
export const useEvents = (from: LocalDate, to: LocalDate) =>
  useCalendarRead(["events", from, to], (calendar) =>
    calendar.listEvents(from, to)
  );

export const useCalendars = () =>
  useCalendarRead(["calendars"], (calendar) => calendar.listCalendars());

export const useSyncStatus = () =>
  useCalendarRead(["status"], (calendar) => calendar.syncStatus());

/** Runs a calendar write, then refreshes every list. */
export const useCalendarAction = <Input, Result>(
  action: (calendar: RemoteCalendar, input: Input) => Promise<Result>
) => {
  const calendar = useCalendar();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: Input) => action(calendar, input),
    onSettled: () => client.invalidateQueries(),
  });
};

/**
 * The message of an error from the main process, without the "Error
 * invoking remote method" wrapper Electron adds.
 */
export const errorText = (error: Error): string =>
  error.message.replace(
    /^Error invoking remote method '[^']+': (?:\w+: )?/u,
    ""
  );
