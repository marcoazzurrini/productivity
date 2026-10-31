import type {
  CalendarEvent,
  CalendarInfo,
  NewEvent,
} from "@productivity/calendar";
import { addDays } from "@productivity/gtd";
import {
  Button,
  Checkbox,
  Dialog,
  FilterSelect,
  Kbd,
  TextField,
  useToast,
} from "@productivity/ui";
import type { CalendarRange } from "@productivity/ui";
import { color, font, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

import { errorText, useCalendarAction, useCalendars } from "./data.ts";

const styles = stylex.create({
  allDay: {
    alignItems: "center",
    color: color.textSecondary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size13,
    gap: space.s2,
    marginTop: space.s4,
  },
  grid: {
    display: "grid",
    gap: space.s3,
    gridTemplateColumns: "1fr 1fr",
    marginTop: space.s3,
  },
  hint: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size12,
  },
  note: {
    color: color.textSecondary,
    fontFamily: font.family,
    fontSize: font.size12,
    marginBottom: 0,
    marginTop: space.s4,
  },
  problem: { color: color.nowLine },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.s2,
    marginTop: space.s4,
  },
  spacer: { flexGrow: 1 },
});

/** What the dialog edits: a new event over a range, or an existing one. */
export type EventDialogTarget =
  | { kind: "create"; range: CalendarRange }
  | { kind: "edit"; event: CalendarEvent };

interface Draft {
  title: string;
  allDay: boolean;
  startDay: string;
  startTime: string;
  /** For all-day events, the last day: the form shows it inclusive. */
  endDay: string;
  endTime: string;
  /** Null until the user picks one: the main process then uses the default. */
  calendarId: string | null;
}

const draftOf = (
  allDay: boolean,
  start: string,
  end: string,
  title: string,
  calendarId: string | null
): Draft => ({
  allDay,
  calendarId,
  endDay: allDay ? addDays(end, -1) : end.slice(0, 10),
  endTime: allDay ? "10:00" : end.slice(11, 16),
  startDay: start.slice(0, 10),
  startTime: allDay ? "09:00" : start.slice(11, 16),
  title,
});

/** The draft as calendar times, or null when the end is not after the start. */
const timesOf = (draft: Draft): CalendarRange | null => {
  const range = draft.allDay
    ? {
        allDay: true,
        end: draft.endDay === "" ? "" : addDays(draft.endDay, 1),
        start: draft.startDay,
      }
    : {
        allDay: false,
        end: `${draft.endDay}T${draft.endTime}`,
        start: `${draft.startDay}T${draft.startTime}`,
      };

  const complete = draft.allDay
    ? draft.startDay !== "" && draft.endDay !== ""
    : [draft.startDay, draft.endDay, draft.startTime, draft.endTime].every(
        (part) => part !== ""
      );

  return complete && range.end > range.start ? range : null;
};

const defaultIdOf = (calendars: CalendarInfo[]): string =>
  calendars.find((calendar) => calendar.isDefault)?.id ?? "local";

/** Leaves the calendar out unless the user picked one. */
const newEventOf = (draft: Draft, times: CalendarRange): NewEvent => {
  const event: NewEvent = { ...times, title: draft.title };

  if (draft.calendarId !== null) {
    event.calendarId = draft.calendarId;
  }

  return event;
};

/** Creates or edits a calendar event. */
export const EventDialog = ({
  target,
  onClose,
}: {
  target: EventDialogTarget;
  onClose: () => void;
}) => {
  const toast = useToast();
  const calendars = useCalendars().data ?? [];
  const writable = calendars.filter((calendar) => calendar.writable);

  // The list may still be loading when the dialog opens, so the draft only
  // records a calendar the user picks, and shows the default until then.
  const fallback = defaultIdOf(writable);

  const [draft, setDraft] = useState<Draft>(() =>
    target.kind === "create"
      ? draftOf(
          target.range.allDay,
          target.range.start,
          target.range.end,
          "",
          null
        )
      : draftOf(
          target.event.allDay,
          target.event.start,
          target.event.end,
          target.event.title,
          target.event.calendarId
        )
  );

  const event = target.kind === "edit" ? target.event : null;
  const readOnly = event !== null && !event.editable;
  const times = timesOf(draft);

  const set =
    <Field extends keyof Draft>(field: Field) =>
    (value: Draft[Field]) => {
      setDraft((current) => ({ ...current, [field]: value }));
    };

  const onError = (error: Error): void => {
    toast({ title: errorText(error) });
  };

  const save = useCalendarAction(
    (calendar, input: { draft: Draft; times: CalendarRange }) =>
      event === null
        ? calendar.createEvent(newEventOf(input.draft, input.times))
        : calendar.updateEvent(event.id, {
            ...input.times,
            title: input.draft.title,
          })
  );

  const remove = useCalendarAction((calendar, id: string) =>
    calendar.deleteEvent(id)
  );

  const submit = (): void => {
    if (times === null || readOnly) {
      return;
    }

    save.mutate({ draft, times }, { onError });
    onClose();
  };

  return (
    <Dialog
      footer={
        <>
          {event === null || readOnly ? null : (
            <Button
              onClick={() => {
                remove.mutate(event.id, { onError });
                onClose();
              }}
              size="small"
              variant="ghost"
            >
              Delete
            </Button>
          )}
          <span {...stylex.props(styles.spacer)} />
          {readOnly ? (
            <Button onClick={onClose} size="small" variant="primary">
              Close
            </Button>
          ) : (
            <>
              <span {...stylex.props(styles.hint)}>
                <Kbd>⌘↵</Kbd> Save
              </span>
              <Button onClick={onClose} size="small" variant="outline">
                Cancel
              </Button>
              <Button
                disabled={times === null}
                onClick={submit}
                size="small"
                variant="primary"
              >
                Save
              </Button>
            </>
          )}
        </>
      }
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
      title={event === null ? "New event" : "Edit event"}
    >
      <TextField
        appearance="bare"
        autoFocus={!readOnly}
        hideLabel
        label="Title"
        onKeyDown={(keyEvent) => {
          if (
            keyEvent.key === "Enter" &&
            (keyEvent.metaKey || event === null)
          ) {
            // The dialog closes and hands focus back, often to a header
            // button; without this, the same Enter would press that button.
            keyEvent.preventDefault();
            submit();
          }
        }}
        onValueChange={set("title")}
        placeholder="Add title"
        value={draft.title}
      />
      <div {...stylex.props(styles.allDay)}>
        <Checkbox
          checked={draft.allDay}
          disabled={readOnly}
          label="All day"
          onCheckedChange={set("allDay")}
        />
        <span aria-hidden>All day</span>
      </div>
      <div {...stylex.props(styles.grid)}>
        <TextField
          label="Starts"
          onValueChange={set("startDay")}
          type="date"
          value={draft.startDay}
        />
        {draft.allDay ? (
          <TextField
            label="Ends"
            onValueChange={set("endDay")}
            type="date"
            value={draft.endDay}
          />
        ) : (
          <TextField
            label="Start time"
            onValueChange={set("startTime")}
            type="time"
            value={draft.startTime}
          />
        )}
        {draft.allDay ? null : (
          <>
            <TextField
              label="Ends"
              onValueChange={set("endDay")}
              type="date"
              value={draft.endDay}
            />
            <TextField
              label="End time"
              onValueChange={set("endTime")}
              type="time"
              value={draft.endTime}
            />
          </>
        )}
      </div>
      {event === null && writable.length > 1 ? (
        <div {...stylex.props(styles.row)}>
          <FilterSelect
            label="Calendar"
            onValueChange={set("calendarId")}
            options={writable.map((calendar) => ({
              label: calendar.name,
              value: calendar.id,
            }))}
            value={draft.calendarId ?? fallback}
          />
        </div>
      ) : null}
      {times === null && !readOnly ? (
        <p {...stylex.props(styles.note, styles.problem)}>
          The event must end after it starts.
        </p>
      ) : null}
      {readOnly ? (
        <p {...stylex.props(styles.note)}>
          You can’t change this event. It is on a read-only calendar, or it is
          someone else’s invitation.
        </p>
      ) : null}
      {event?.recurring === true && !readOnly ? (
        <p {...stylex.props(styles.note)}>
          This is one occurrence of a repeating event. Changes apply to this
          occurrence only.
        </p>
      ) : null}
    </Dialog>
  );
};
