import { color } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

import { useAgentContext } from "./agent-context.tsx";
import { AgentPane } from "./agent-pane.tsx";
import { CalendarPane } from "./calendar-pane.tsx";
import { useNavigation } from "./navigation.tsx";
import { ClarifyScreen } from "./screens/clarify.tsx";
import { InboxScreen } from "./screens/inbox.tsx";
import { JournalScreen } from "./screens/journal.tsx";
import { NextActionsScreen } from "./screens/next-actions.tsx";
import { ProjectScreen } from "./screens/project.tsx";
import { ReviewScreen } from "./screens/review.tsx";
import { SomedayScreen } from "./screens/someday.tsx";
import { UpcomingScreen } from "./screens/upcoming.tsx";
import { WaitingScreen } from "./screens/waiting.tsx";
import { Sidebar } from "./sidebar.tsx";
import { useWeekPane } from "./week-pane.tsx";

const styles = stylex.create({
  // The agent is as wide as the page beside it.
  agent: {
    borderInlineEndColor: color.borderDefault,
    borderInlineEndStyle: "solid",
    borderInlineEndWidth: 1,
    flexBasis: "clamp(420px, 34vw, 860px)",
    flexShrink: 1,
    minWidth: 360,
  },
  // With the week put away, the agent takes the rest of the window.
  agentAlone: { borderInlineEndWidth: 0, flexGrow: 1 },
  calendar: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  main: {
    borderInlineEndColor: color.borderDefault,
    borderInlineEndStyle: "solid",
    borderInlineEndWidth: 1,
    display: "flex",
    // 860 px on a 27-inch display, narrower on smaller windows.
    flexBasis: "clamp(560px, 34vw, 860px)",
    flexDirection: "column",
    flexShrink: 0,
    minWidth: 0,
    // Toasts place themselves inside this pane.
    position: "relative",
  },
  // Without the week beside it, the list takes the free width and its
  // reading column centers there.
  mainAlone: {
    borderInlineEndWidth: 0,
    flexGrow: 1,
  },
  shell: {
    backgroundColor: color.bgPage,
    display: "flex",
    height: "100%",
    overflow: "hidden",
  },
});

const CurrentScreen = () => {
  const { view } = useNavigation();

  switch (view.kind) {
    case "inbox": {
      return <InboxScreen />;
    }

    case "clarify": {
      return <ClarifyScreen startWith={view.taskId} />;
    }

    case "next": {
      return <NextActionsScreen contextId={view.contextId} />;
    }

    case "upcoming": {
      return <UpcomingScreen />;
    }

    case "waiting": {
      return <WaitingScreen />;
    }

    case "someday": {
      return <SomedayScreen />;
    }

    case "project": {
      return <ProjectScreen key={view.projectId} projectId={view.projectId} />;
    }

    case "journal": {
      return <JournalScreen day={view.day} />;
    }

    default: {
      return <ReviewScreen />;
    }
  }
};

/**
 * Lists on the left, the chosen list in the middle, the week on the right.
 * The week can be put away from any page's top bar. With the agent open,
 * it sits beside the page and the week shrinks to today.
 */
export const App = () => {
  const weekPane = useWeekPane();
  const { open, generation } = useAgentContext();
  const alone = !weekPane.shown && !open;

  return (
    <div {...stylex.props(styles.shell)}>
      <Sidebar />
      <main {...stylex.props(styles.main, alone && styles.mainAlone)}>
        <CurrentScreen />
      </main>
      {open ? (
        <aside
          aria-label="Agent"
          {...stylex.props(styles.agent, !weekPane.shown && styles.agentAlone)}
        >
          <AgentPane key={generation} />
        </aside>
      ) : null}
      {weekPane.shown ? (
        <aside
          aria-label={open ? "Day" : "Week"}
          {...stylex.props(styles.calendar)}
        >
          <CalendarPane days={open ? 1 : 7} />
        </aside>
      ) : null}
    </div>
  );
};
