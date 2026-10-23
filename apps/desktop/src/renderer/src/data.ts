import type { LocalDate, RemoteGtdStore } from "@productivity/gtd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
