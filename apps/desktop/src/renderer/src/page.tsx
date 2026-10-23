import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 30,
    maxWidth: 640,
    paddingBottom: space.s20,
    width: "100%",
  },
  scroll: {
    display: "flex",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 0,
    overflowY: "auto",
    paddingInline: space.s8,
    paddingTop: space.s10,
  },
  topbar: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: space.s3,
    height: 52,
    paddingInline: space.s5,
  },
});

/**
 * The center pane's frame: a drag strip for the window, then content held
 * to a 640 px reading column.
 */
export const Page = ({
  topbar,
  children,
}: {
  topbar?: ReactNode;
  children: ReactNode;
}) => (
  <>
    <div className="drag-region" {...stylex.props(styles.topbar)}>
      {topbar}
    </div>
    <div {...stylex.props(styles.scroll)}>
      <div {...stylex.props(styles.column)}>{children}</div>
    </div>
  </>
);

const sectionStyles = stylex.create({
  section: { display: "flex", flexDirection: "column", gap: 6 },
});

/** A titled group of rows inside a page. */
export const Section = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => (
  <section aria-label={label} {...stylex.props(sectionStyles.section)}>
    {children}
  </section>
);

const hintStyles = stylex.create({
  hint: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: color.bgSidebar,
    borderRadius: radius.md,
    color: color.textTertiary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size12,
    gap: space.s2,
    margin: 0,
    paddingBlock: 6,
    paddingInline: 10,
  },
  row: { display: "flex", flexWrap: "wrap", gap: space.s2 },
});

/** A quiet explanation under a list. */
export const Hint = ({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <p {...stylex.props(hintStyles.hint)}>
    {icon}
    {children}
  </p>
);

/** Filters or buttons laid out in a wrapping row. */
export const Row = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(hintStyles.row)}>{children}</div>
);
