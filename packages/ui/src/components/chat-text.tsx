import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, radius } from "../tokens.stylex.ts";

const styles = stylex.create({
  code: {
    backgroundColor: color.bgHover,
    borderRadius: radius.xs,
    fontFamily: font.mono,
    fontSize: "0.9em",
    paddingInline: 4,
  },
  heading: { fontWeight: font.weightSemibold, margin: 0 },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    margin: 0,
    paddingInlineStart: 22,
  },
  paragraph: { margin: 0 },
  root: {
    color: color.textPrimary,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    fontSize: font.size15,
    gap: 10,
    lineHeight: "24px",
    overflowWrap: "anywhere",
  },
});

const inlinePattern =
  /(?<styled>`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/u;

/** **bold**, *italic* and `code` inside one line of text. */
const renderInline = (text: string): ReactNode[] =>
  text
    .split(inlinePattern)
    .filter((part) => part !== "")
    .map((part, index) => {
      const key = `${index}:${part}`;

      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={key} {...stylex.props(styles.code)}>
            {part.slice(1, -1)}
          </code>
        );
      }

      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }

      if (
        ((part.startsWith("*") && part.endsWith("*")) ||
          (part.startsWith("_") && part.endsWith("_"))) &&
        part.length > 2
      ) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }

      return part;
    });

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "bullets" | "numbers"; items: string[] };

const bullet = /^\s*[-*•]\s+(?<item>.*)$/u;
const numbered = /^\s*\d+[.)]\s+(?<item>.*)$/u;
const heading = /^#{1,6}\s+(?<item>.*)$/u;

const toBlocks = (text: string): Block[] => {
  const blocks: Block[] = [];

  for (const line of text.split("\n")) {
    const last = blocks.at(-1);
    const asBullet = bullet.exec(line);
    const asNumber = numbered.exec(line);
    const asHeading = heading.exec(line);

    if (line.trim() === "") {
      blocks.push({ kind: "paragraph", lines: [] });
    } else if (asHeading !== null) {
      blocks.push({ kind: "heading", text: asHeading.groups?.item ?? "" });
    } else if (asBullet !== null || asNumber !== null) {
      const kind = asBullet === null ? "numbers" : "bullets";
      const item = (asBullet ?? asNumber)?.groups?.item ?? "";

      if (last?.kind === kind) {
        last.items.push(item);
      } else {
        blocks.push({ items: [item], kind });
      }
    } else if (last?.kind === "paragraph" && last.lines.length > 0) {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "paragraph", lines: [line] });
    }
  }

  return blocks.filter(
    (block) => block.kind !== "paragraph" || block.lines.length > 0
  );
};

export interface ChatTextProps {
  text: string;
}

/**
 * A chat reply's text, with the little Markdown models write: paragraphs,
 * lists, headings, bold, italics and code.
 */
export const ChatText = ({ text }: ChatTextProps) => (
  <div {...stylex.props(styles.root)}>
    {toBlocks(text).map((block, index) => {
      const key = `${index}:${block.kind}`;

      switch (block.kind) {
        case "heading": {
          return (
            <p key={key} {...stylex.props(styles.heading)}>
              {renderInline(block.text)}
            </p>
          );
        }

        case "bullets":
        case "numbers": {
          const List = block.kind === "bullets" ? "ul" : "ol";

          return (
            <List key={key} {...stylex.props(styles.list)}>
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}:${item}`}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }

        default: {
          return (
            <p key={key} {...stylex.props(styles.paragraph)}>
              {block.lines.flatMap((line, lineIndex) =>
                lineIndex === 0
                  ? renderInline(line)
                  : [<br key={`br${lineIndex}`} />, ...renderInline(line)]
              )}
            </p>
          );
        }
      }
    })}
  </div>
);
