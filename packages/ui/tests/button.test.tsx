import { describe, expect, mock, test } from "bun:test";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "../src/index.ts";

describe("Button", () => {
  test("is a native button that runs its action on click", async () => {
    const onClick = mock();

    render(
      <Button onClick={onClick} variant="primary">
        Start clarifying
      </Button>
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Start clarifying" })
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("shows a shortcut hint as part of its label", () => {
    render(<Button shortcut="⌘N">New to-do</Button>);

    expect(screen.getByRole("button").textContent).toBe("New to-do⌘N");
  });

  test("does not run its action when disabled", async () => {
    const onClick = mock();

    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  test("gets StyleX class names", () => {
    render(<Button>Styled</Button>);

    expect(screen.getByRole("button").className.length).toBeGreaterThan(0);
  });
});
