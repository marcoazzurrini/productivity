import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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

  it("hides Google when the app has no Google client", async () => {
    renderApp();

    await within(week()).findByText("Design review");

    expect(screen.queryByRole("button", { name: /Google/u })).toBeNull();
  });
});
