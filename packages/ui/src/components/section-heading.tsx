import * as stylex from "@stylexjs/stylex";
import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";
import { IconButton } from "./icon-button.tsx";
import { Menu } from "./menu.tsx";
import type { MenuAction } from "./menu.tsx";

export interface SectionHeadingProps {
  title: string;
  /** How many rows the section holds, or progress such as "2 of 3". */
  count?: number | string;
  /** Things to do with the whole section, behind a "…" button. */
  menu?: readonly (MenuAction | "separator")[];
  /** Other controls at the right end. */
  actions?: ReactNode;
}

const styles = stylex.create({
  count: {
    color: color.textTertiary,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
  },
  heading: {
    alignItems: "flex-end",
    borderBottomColor: color.borderDefault,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    display: "flex",
    gap: space.s2,
    minHeight: 40,
    paddingBottom: space.s2,
  },
  // The "…" takes the heading's color, and sits on its baseline row without
  // making the heading taller.
  menu: {
    color: { ":hover": color.textLink, default: color.textLink },
    height: 22,
    marginBlock: -2,
  },
  spacer: { flexGrow: 1 },
  title: {
    color: color.textLink,
    fontFamily: font.family,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
});

export const SectionHeading = ({
  title,
  count,
  menu,
  actions,
}: SectionHeadingProps) => (
  <div {...stylex.props(styles.heading)}>
    <h2 {...stylex.props(styles.title)}>{title}</h2>
    {count === undefined ? null : (
      <span {...stylex.props(styles.count)}>{count}</span>
    )}
    <span {...stylex.props(styles.spacer)} />
    {actions}
    {menu === undefined || menu.length === 0 ? null : (
      <Menu
        items={menu}
        trigger={
          <IconButton
            icon={<Ellipsis size={18} />}
            label={`${title} options`}
            xstyle={styles.menu}
          />
        }
      />
    )}
  </div>
);
