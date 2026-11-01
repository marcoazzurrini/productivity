import type { ViewContext } from "@productivity/agent";

import { dayLabel } from "./format.ts";
import type { Lookups } from "./lookups.ts";
import type { View } from "./navigation.tsx";

/** What the agent should see of the center pane, and the chip's words. */
export interface ViewDescription {
  context: ViewContext;
  label: string;
}

export const viewContextOf = (
  view: View,
  lookups: Lookups
): ViewDescription => {
  switch (view.kind) {
    case "journal": {
      return {
        context: { day: view.day, view: "journal" },
        label: `Journal · ${dayLabel(view.day)}`,
      };
    }

    case "next": {
      return { context: { view: "next-actions" }, label: "Next Actions" };
    }

    case "upcoming": {
      return { context: { view: "upcoming" }, label: "Upcoming" };
    }

    case "waiting": {
      return { context: { view: "waiting" }, label: "Waiting For" };
    }

    case "someday": {
      return { context: { view: "someday" }, label: "Someday / Maybe" };
    }

    case "project": {
      return {
        context: { projectId: view.projectId, view: "project" },
        label: lookups.project(view.projectId)?.name ?? "Project",
      };
    }

    case "review": {
      return { context: { view: "review" }, label: "Weekly Review" };
    }

    default: {
      // The Inbox, and clarifying it.
      return { context: { view: "inbox" }, label: "Inbox" };
    }
  }
};
