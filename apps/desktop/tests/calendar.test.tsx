import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventDialog } from "../src/renderer/src/event-dialog.tsx";
import { renderApp } from "./harness.tsx";

const week = () => screen.getByRole("complementary", { name: "Week" });

const eventsOn = (
  calendar: ReturnType<typeof renderApp>["calendar"],
  title: string
) =>
  calendar
    .listEvents("2026-10-19", "2026-10-26")
    .filter((event) => event.title === title);

describe("the week calendar", () => {
  it("shows events and time-blocked tasks side by side", async () => {
    renderApp();

    await expect(
      within(week()).findByText("Q4 planning week")
    ).resolves.toBeDefined();
    expect(within(week()).getByText("Design review")).toBeDefined();
    expect(within(week()).getByText("Draft slide outline")).toBeDefined();
  });

  it("renames an event from its dialog", async () => {
    const { calendar } = renderApp();
    const user = userEvent.setup();

    await user.click(await within(week()).findByText("Design review"));

    const dialog = await screen.findByRole("dialog", { name: "Edit event" });
    const title = within(dialog).getByRole("textbox", { name: "Title" });

    await user.clear(title);
    await user.type(title, "Design critique");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await expect(
      within(week()).findByText("Design critique")
    ).resolves.toBeDefined();
    expect(eventsOn(calendar, "Design critique")).toMatchObject([
      { end: "2026-10-19T12:00", start: "2026-10-19T11:00" },
    ]);
  });

  it("refuses an end before the start", async () => {
    renderApp();
    const user = userEvent.setup();

    await user.click(await within(week()).findByText("Design review"));

    const dialog = await screen.findByRole("dialog", { name: "Edit event" });
    const endTime = within(dialog).getByLabelText("End time");

    await user.clear(endTime);
    await user.type(endTime, "10:00");

    expect(
      within(dialog).getByText("The event must end after it starts.")
    ).toBeDefined();
    expect(
      within(dialog)
        .getByRole("button", { name: "Save" })
        .hasAttribute("disabled")
    ).toBeTruthy();
  });

  it("deletes an event", async () => {
    const { calendar } = renderApp();
    const user = userEvent.setup();

    await user.click(await within(week()).findByText("Design review"));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete",
      })
    );

    await waitFor(() => {
      expect(within(week()).queryByText("Design review")).toBeNull();
    });
    expect(eventsOn(calendar, "Design review")).toStrictEqual([]);
  });

  it("opens a time-blocked task in the task dialog", async () => {
    renderApp();
    const user = userEvent.setup();

    await user.click(await within(week()).findByText("Draft slide outline"));

    await expect(
      screen.findByRole("dialog", { name: "Edit to-do" })
    ).resolves.toBeDefined();
  });

  it("saves with Enter and stops that Enter from pressing anything else", async () => {
    const onClose = vi.fn<() => void>();

    renderApp(
      undefined,
      undefined,
      <EventDialog
        onClose={onClose}
        target={{
          kind: "create",
          range: {
            allDay: false,
            end: "2026-10-23T16:00",
            start: "2026-10-23T15:00",
          },
        }}
      />
    );

    const title = within(
      await screen.findByRole("dialog", { name: "New event" })
    ).getByRole("textbox", { name: "Title" });

    fireEvent.change(title, { target: { value: "Lunch" } });

    // The dialog closes and focus returns to the button that had it, such
    // as Google Calendar in the header. In Chromium that button would take
    // the same Enter as a click, unless the Enter's default is cancelled.
    const notCancelled = fireEvent.keyDown(title, { key: "Enter" });

    expect(notCancelled).toBeFalsy();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("puts a new event on the default calendar, even before calendars load", async () => {
    const { calendar } = renderApp(
      undefined,
      (store) => {
        store.calendarRepository.saveCalendar({
          color: "#039BE5",
          id: "google:me@example.com",
          name: "Events",
          position: 1,
          primary: true,
          remoteId: "me@example.com",
          source: "google",
          syncToken: null,
          writable: true,
        });
      },
      <EventDialog
        onClose={vi.fn<() => void>()}
        target={{
          kind: "create",
          range: {
            allDay: false,
            end: "2026-10-23T16:00",
            start: "2026-10-23T15:00",
          },
        }}
      />
    );

    const user = userEvent.setup();

    const dialog = await screen.findByRole("dialog", { name: "New event" });

    await user.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "Call the bank"
    );
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(
        calendar
          .listEvents("2026-10-23", "2026-10-24")
          .filter((event) => event.title === "Call the bank")
      ).toMatchObject([{ calendarId: "google:me@example.com" }]);
    });
  });

  it("hides Google when the app has no Google client", async () => {
    renderApp();

    await within(week()).findByText("Design review");

    expect(screen.queryByRole("button", { name: /Google/u })).toBeNull();
  });
});
