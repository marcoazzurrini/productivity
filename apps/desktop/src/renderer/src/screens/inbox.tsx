import { datePart } from "@productivity/gtd";
import type { CaptureSource } from "@productivity/gtd";
import {
  Banner,
  Button,
  EmptyState,
  PageHeader,
  TaskList,
  TaskRow,
} from "@productivity/ui";
import {
  ArrowRight,
  Globe,
  Inbox,
  Mail,
  MessageSquare,
  Mic,
  PenLine,
  Split,
} from "lucide-react";
import { useEffect } from "react";

import { useInbox, useOverview } from "../data.ts";
import { shortDate, timeLabel } from "../format.ts";
import { useNavigation } from "../navigation.tsx";
import { Page, Section } from "../page.tsx";

const sourceIcon: Record<CaptureSource, typeof Mail> = {
  chat: MessageSquare,
  mail: Mail,
  manual: PenLine,
  voice: Mic,
  web: Globe,
};

const sourceName: Record<CaptureSource, string> = {
  chat: "Chat",
  mail: "Mail",
  manual: "Captured",
  voice: "Voice note",
  web: "Web",
};

export const InboxScreen = () => {
  const { go } = useNavigation();
  const items = useInbox().data ?? [];
  const today = useOverview().data?.today;

  // C starts clarifying, unless the user is typing somewhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const typing =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;

      if (!typing && !event.metaKey && event.key === "c" && items.length > 0) {
        go({ kind: "clarify", taskId: null });
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [go, items.length]);

  return (
    <Page>
      <PageHeader
        aside={`${items.length} ${items.length === 1 ? "item" : "items"}`}
        description="Everything you capture lands here, unsorted. Nothing in the Inbox is a commitment yet."
        icon={<Inbox color="#0582FF" size={30} />}
        title="Inbox"
      />
      {items.length === 0 ? (
        <EmptyState icon={<Inbox size={32} />} title="Inbox zero">
          Everything is clarified. Capture new thoughts with ⌘N.
        </EmptyState>
      ) : (
        <>
          <Banner
            action={
              <Button
                onClick={() => {
                  go({ kind: "clarify", taskId: null });
                }}
                shortcut="C"
                variant="primary"
              >
                Start clarifying
              </Button>
            }
            description="Go through them one at a time. For each, decide what it is and what happens next."
            icon={<Split size={18} />}
            title={`${items.length} ${items.length === 1 ? "item" : "items"} to clarify`}
          />
          <Section label="Unclarified items">
            <TaskList label="Inbox">
              {items.map((item) => {
                const Icon = sourceIcon[item.source];

                const when =
                  today !== undefined && datePart(item.capturedAt) === today
                    ? timeLabel(item.capturedAt)
                    : shortDate(datePart(item.capturedAt));

                return (
                  <TaskRow
                    actions={
                      <Button
                        icon={<ArrowRight size={14} />}
                        onClick={() => {
                          go({ kind: "clarify", taskId: item.id });
                        }}
                        size="small"
                        variant="primary"
                      >
                        Clarify
                      </Button>
                    }
                    hasNotes={item.notes.length > 0}
                    key={item.id}
                    leading={<Icon aria-hidden color="#91918E" size={15} />}
                    meta={`${sourceName[item.source]} · ${when}`}
                    revealActions
                    title={item.title}
                  />
                );
              })}
            </TaskList>
          </Section>
        </>
      )}
    </Page>
  );
};
