import { IconButton } from "@productivity/ui";
import { color } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Sparkles } from "lucide-react";

import { useAgentContext } from "./agent-context.tsx";

const styles = stylex.create({
  on: {
    backgroundColor: {
      ":hover": color.accentSubtleHover,
      default: color.accentSubtle,
    },
    color: { ":hover": color.accent, default: color.accent },
  },
});

/** Opens and closes the agent pane, in every page's top bar. */
export const AgentToggle = () => {
  const { open, setOpen } = useAgentContext();

  return (
    <IconButton
      aria-pressed={open}
      icon={<Sparkles size={16} />}
      label={open ? "Close the agent (⌘L)" : "Open the agent (⌘L)"}
      onClick={() => {
        setOpen(!open);
      }}
      xstyle={open && styles.on}
    />
  );
};
