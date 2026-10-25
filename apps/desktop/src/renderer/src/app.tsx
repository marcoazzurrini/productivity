import { color } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

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

const styles = stylex.create({
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

/** Lists on the left, the chosen list in the middle, the week on the right. */
export const App = () => (
  <div {...stylex.props(styles.shell)}>
    <Sidebar />
    <main {...stylex.props(styles.main)}>
      <CurrentScreen />
    </main>
    <aside aria-label="Week" {...stylex.props(styles.calendar)}>
      <CalendarPane />
    </aside>
  </div>
);
