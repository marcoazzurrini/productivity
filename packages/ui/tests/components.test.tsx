import { describe, expect, mock, test } from "bun:test";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Avatar,
  ChoiceCards,
  NavItem,
  ProgressSteps,
  SegmentedControl,
  TaskList,
  TaskRow,
  TextField,
  initialsOf,
} from "../src/index.ts";

describe("TaskRow", () => {
  test("ticks a task through a labelled checkbox", async () => {
    const onDoneChange = mock();

    render(
      <TaskList label="Today">
        <TaskRow
          done={false}
          onDoneChange={onDoneChange}
          title="Draft slide outline"
        />
      </TaskList>
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Complete Draft slide outline" })
    );

    expect(onDoneChange).toHaveBeenCalledWith(true);
  });

  test("opens the task from its title", async () => {
    const onOpen = mock();

    render(
      <TaskList label="Inbox">
        <TaskRow onOpen={onOpen} title="Book flights" />
      </TaskList>
    );
    await userEvent.click(screen.getByRole("button", { name: "Book flights" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  test("announces stars and notes", () => {
    render(
      <TaskList label="List">
        <TaskRow hasNotes starred title="Review data" />
      </TaskList>
    );

    expect(screen.getByText("Starred")).toBeDefined();
    expect(screen.getByText("Has notes")).toBeDefined();
  });

  test("is draggable only when it has a drag id", () => {
    render(
      <TaskList label="List">
        <TaskRow dragId="t1" title="Movable" />
        <TaskRow title="Fixed" />
      </TaskList>
    );

    const [movable, fixed] = screen.getAllByRole("listitem");

    expect(movable?.getAttribute("draggable")).toBe("true");
    expect(fixed?.getAttribute("draggable")).toBe("false");
  });
});

describe("NavItem", () => {
  test("marks the selected destination as the current page", async () => {
    const onSelect = mock();

    render(
      <NavItem count={7} icon="•" label="Inbox" onSelect={onSelect} selected />
    );
    await userEvent.click(screen.getByRole("button", { name: "Inbox 7" }));

    expect(screen.getByRole("button").getAttribute("aria-current")).toBe(
      "page"
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("ChoiceCards", () => {
  const choices = [
    { title: "No, it stands alone", value: "none" },
    { title: "Yes, add it to a project", value: "existing" },
  ];

  test("selects a card by click", async () => {
    const onValueChange = mock();

    render(
      <ChoiceCards
        choices={choices}
        label="Project"
        onValueChange={onValueChange}
        value={null}
      />
    );
    await userEvent.click(screen.getByText("Yes, add it to a project"));

    expect(onValueChange).toHaveBeenCalledWith("existing");
  });

  test("selects a card with its number key", async () => {
    const onValueChange = mock();

    render(
      <ChoiceCards
        choices={choices}
        label="Project"
        numberShortcuts
        onValueChange={onValueChange}
        value={null}
      />
    );
    await userEvent.keyboard("2");

    expect(onValueChange).toHaveBeenCalledWith("existing");
  });

  test("ignores number keys while the user types", async () => {
    const onValueChange = mock();

    render(
      <>
        <TextField label="Name" onValueChange={() => {}} value="" />
        <ChoiceCards
          choices={choices}
          label="Project"
          numberShortcuts
          onValueChange={onValueChange}
          value={null}
        />
      </>
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "1");

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("SegmentedControl", () => {
  test("reports the pressed option", async () => {
    const onValueChange = mock();

    render(
      <SegmentedControl
        label="Context"
        onValueChange={onValueChange}
        options={[
          { label: "All", value: "all" },
          { label: "@Calls", value: "calls" },
        ]}
        value="all"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "@Calls" }));

    expect(onValueChange).toHaveBeenCalledWith("calls");
  });
});

describe("small pieces", () => {
  test("initials come from the first two words", () => {
    expect(initialsOf("Eric Chen")).toBe("EC");
    expect(initialsOf("  apple  store front ")).toBe("AS");
  });

  test("an avatar is named for screen readers", () => {
    render(<Avatar name="Olivia Grant" />);

    expect(screen.getByText("Olivia Grant")).toBeDefined();
    expect(screen.getByText("OG").getAttribute("aria-hidden")).toBe("true");
  });

  test("progress exposes its value", () => {
    render(
      <ProgressSteps
        caption="Item 3 of 7"
        done={2}
        label="Clarifying"
        total={7}
      />
    );

    const bar = screen.getByRole("progressbar", { name: "Clarifying" });

    expect(bar.getAttribute("aria-valuenow")).toBe("2");
    expect(bar.getAttribute("aria-valuemax")).toBe("7");
  });

  test("a text field reports typed text", async () => {
    const onValueChange = mock();

    render(<TextField label="Title" onValueChange={onValueChange} value="" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "a");

    expect(onValueChange).toHaveBeenCalledWith("a");
  });
});
