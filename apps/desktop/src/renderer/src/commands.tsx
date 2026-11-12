import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * Things the toolbar can ask of the screen that is open. Only the screen
 * knows how to do them, so it registers a handler while it is shown.
 */
export type Command = "new-heading";

type Handlers = Partial<Record<Command, () => void>>;

interface Commands {
  handlers: Handlers;
  register: (command: Command, handler: () => void) => () => void;
}

const CommandContext = createContext<Commands | null>(null);

export const CommandProvider = ({ children }: { children: ReactNode }) => {
  const [handlers, setHandlers] = useState<Handlers>({});

  // Stable, so registering a handler never re-runs the effect that did it.
  const register = useCallback((command: Command, handler: () => void) => {
    setHandlers((current) => ({ ...current, [command]: handler }));

    return () => {
      setHandlers((current) => {
        // Another screen may have registered since: keep its handler.
        if (current[command] !== handler) {
          return current;
        }

        return Object.fromEntries(
          Object.entries(current).filter(([name]) => name !== command)
        );
      });
    };
  }, []);

  const value = useMemo(() => ({ handlers, register }), [handlers, register]);

  return <CommandContext value={value}>{children}</CommandContext>;
};

const useCommands = (): Commands => {
  const commands = use(CommandContext);

  if (commands === null) {
    throw new Error("Commands need a CommandProvider above them.");
  }

  return commands;
};

/**
 * Handles a toolbar command while the calling screen is shown. Pass a
 * handler that keeps its identity between renders, such as one from
 * useCallback, or the command registers again on every render.
 */
export const useCommandHandler = (
  command: Command,
  handler: () => void
): void => {
  const { register } = useCommands();

  useEffect(() => register(command, handler), [command, handler, register]);
};

/** The command as the toolbar sees it: undefined when no screen handles it. */
export const useCommand = (command: Command): (() => void) | undefined =>
  useCommands().handlers[command];
