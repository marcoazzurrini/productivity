import type { LocalDate } from "@productivity/gtd";
import {
  Button,
  MarkdownEditor,
  PageHeader,
  VimModeLine,
} from "@productivity/ui";
import type { CursorPosition, VimMode } from "@productivity/ui";
import { color, font } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createAutosave } from "../autosave.ts";
import type { SaveStatus } from "../autosave.ts";
import { fullDate, weekNumber, wordCount } from "../format.ts";
import { useJournal } from "../journal-context.tsx";
import { Page } from "../page.tsx";

const styles = stylex.create({
  failed: { color: color.textPrimary, fontWeight: font.weightMedium },
  meta: { color: color.textTertiary, fontSize: font.size14 },
});

const statusLabel: Record<SaveStatus, string> = {
  failed: "Not saved. Trying again…",
  saved: "Saved",
  saving: "Saving…",
};

/**
 * One day's page. It loads the page once, then the editor owns the text:
 * refetches never replace what the user is typing. Edits save after a
 * pause, on blur, on leaving the page, and as the window closes.
 */
const JournalDay = ({ day }: { day: LocalDate }) => {
  const journal = useJournal();
  const [status, setStatus] = useState<SaveStatus>("saved");
  // What the editor holds, once the user has typed. Before that, the page.
  const [typed, setTyped] = useState<string | null>(null);
  const [mode, setMode] = useState<VimMode>("normal");
  const [cursor, setCursor] = useState<CursorPosition>({ column: 1, line: 1 });

  const autosave = useMemo(
    () =>
      createAutosave(async (text) => {
        await journal.write(day, text);
      }, setStatus),
    [day, journal]
  );

  // Never cached between visits: a page always opens from the database,
  // after any save from the last visit has landed.
  const page = useQuery({
    gcTime: 0,
    queryFn: () => journal.read(day),
    queryKey: ["journal", day],
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    const saveBeforeClosing = (): void => {
      const text = autosave.takeUnsaved();

      if (text !== null) {
        journal.writeNow(day, text);
      }
    };

    window.addEventListener("beforeunload", saveBeforeClosing);

    return () => {
      window.removeEventListener("beforeunload", saveBeforeClosing);
      void autosave.flush();
    };
  }, [autosave, day, journal]);

  const text = typed ?? page.data?.markdown ?? "";
  const words = wordCount(text);

  const meta =
    text.trim().length === 0 ? (
      `Week ${weekNumber(day)} · New page`
    ) : (
      <>
        {`Week ${weekNumber(day)} · ${words} ${words === 1 ? "word" : "words"} · `}
        <output {...stylex.props(status === "failed" && styles.failed)}>
          {statusLabel[status]}
        </output>
      </>
    );

  return (
    <Page
      footer={
        page.data === undefined ? null : (
          <VimModeLine cursor={cursor} mode={mode} />
        )
      }
    >
      <PageHeader
        description={<span {...stylex.props(styles.meta)}>{meta}</span>}
        icon={<NotebookPen color="#1F9C8E" size={30} />}
        title={fullDate(day)}
      />
      {page.isError ? (
        <p role="alert">
          This page could not be opened.{" "}
          <Button
            onClick={() => {
              void page.refetch();
            }}
            size="small"
            variant="outline"
          >
            Try again
          </Button>
        </p>
      ) : null}
      {page.data === undefined ? null : (
        <MarkdownEditor
          autoFocus
          initialValue={page.data.markdown}
          label={`Journal for ${fullDate(day)}`}
          onBlur={() => {
            void autosave.flush();
          }}
          onChange={(markdown) => {
            setTyped(markdown);
            autosave.change(markdown);
          }}
          onCursorMove={setCursor}
          onSave={() => {
            void autosave.flush();
          }}
          onVimModeChange={setMode}
          placeholder="Write about your day…"
          relativeLineNumbers
          vim
        />
      )}
    </Page>
  );
};

/**
 * A page per day, written in Markdown that formats as you type, with vim
 * keys and relative line numbers.
 */
export const JournalScreen = ({ day }: { day: LocalDate }) => (
  <JournalDay day={day} key={day} />
);
