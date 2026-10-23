import type { Context, ProjectSummary } from "@productivity/gtd";
import { useMemo } from "react";

import { useContexts, useProjects } from "./data.ts";

export interface Lookups {
  context: (id: string | null) => Context | undefined;
  project: (id: string | null) => ProjectSummary | undefined;
  contexts: Context[];
  projects: ProjectSummary[];
}

const noContexts: Context[] = [];
const noProjects: ProjectSummary[] = [];

/** Contexts and projects by id, for labelling tasks. */
export const useLookups = (): Lookups => {
  const contexts = useContexts().data ?? noContexts;
  const projects = useProjects().data ?? noProjects;

  return useMemo(() => {
    const contextById = new Map(
      contexts.map((context) => [context.id, context])
    );

    const projectById = new Map(
      projects.map((project) => [project.id, project])
    );

    return {
      context: (id) => (id === null ? undefined : contextById.get(id)),
      contexts,
      project: (id) => (id === null ? undefined : projectById.get(id)),
      projects,
    };
  }, [contexts, projects]);
};
