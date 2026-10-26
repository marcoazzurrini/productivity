import type { SyncStatus } from "@productivity/calendar";
import { Button, Dialog, useToast } from "@productivity/ui";
import { color, font, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

import { errorText, useCalendarAction, useSyncStatus } from "./data.ts";

const styles = stylex.create({
  body: {
    color: color.textSecondary,
    fontFamily: font.family,
    fontSize: font.size13,
    lineHeight: 1.5,
    marginBottom: 0,
    marginTop: space.s2,
  },
  heading: {
    color: color.textPrimary,
    fontFamily: font.family,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
  problem: { color: color.nowLine },
  spacer: { flexGrow: 1 },
});

const syncedAt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const describe = (status: SyncStatus): string => {
  switch (status.state) {
    case "connected": {
      if (status.syncing) {
        return "Syncing…";
      }

      return status.lastSyncedAt === null
        ? "Connected."
        : `Last synced at ${syncedAt.format(new Date(status.lastSyncedAt))}.`;
    }

    case "connecting": {
      return "Finish signing in to Google in your browser.";
    }

    default: {
      return "Show your Google calendars here, and changes you make here in Google Calendar.";
    }
  }
};

/** The Google Calendar connection, as a button in the calendar's header. */
export const GoogleSync = () => {
  const toast = useToast();
  const status = useSyncStatus().data;
  const [open, setOpen] = useState(false);

  const reportError = (next: SyncStatus): void => {
    if ("error" in next && next.error !== null) {
      toast({ title: next.error });
    }
  };

  const onError = (error: Error): void => {
    toast({ title: errorText(error) });
  };

  const connect = useCalendarAction<undefined, SyncStatus>((calendar) =>
    calendar.connectGoogle()
  );

  const disconnect = useCalendarAction<undefined, SyncStatus>((calendar) =>
    calendar.disconnectGoogle()
  );

  const sync = useCalendarAction<undefined, SyncStatus>((calendar) =>
    calendar.sync()
  );

  if (status === undefined || status.state === "unavailable") {
    return null;
  }

  const error = "error" in status ? status.error : null;
  const connected = status.state === "connected";

  return (
    <>
      <Button
        icon={
          error === null ? (
            <RefreshCw aria-hidden size={14} />
          ) : (
            <AlertCircle aria-hidden size={14} />
          )
        }
        onClick={() => {
          setOpen(true);
        }}
        size="small"
        variant="ghost"
      >
        {connected ? "Google Calendar" : "Connect Google"}
      </Button>
      <Dialog
        footer={
          <>
            {connected ? (
              <Button
                onClick={() => {
                  disconnect.mutate(undefined, { onError });
                  setOpen(false);
                }}
                size="small"
                variant="ghost"
              >
                Disconnect
              </Button>
            ) : null}
            <span {...stylex.props(styles.spacer)} />
            {status.state === "connecting" ? (
              <Button
                onClick={() => {
                  disconnect.mutate(undefined, { onError });
                }}
                size="small"
                variant="outline"
              >
                Cancel
              </Button>
            ) : null}
            {status.state === "disconnected" ? (
              <Button
                onClick={() => {
                  connect.mutate(undefined, {
                    onError,
                    onSuccess: reportError,
                  });
                }}
                size="small"
                variant="primary"
              >
                Connect Google
              </Button>
            ) : null}
            {connected ? (
              <Button
                disabled={status.syncing}
                onClick={() => {
                  sync.mutate(undefined, { onError, onSuccess: reportError });
                }}
                size="small"
                variant="primary"
              >
                Sync now
              </Button>
            ) : null}
          </>
        }
        onOpenChange={setOpen}
        open={open}
        title="Google Calendar"
      >
        <h2 {...stylex.props(styles.heading)}>
          {connected && status.account !== null
            ? status.account
            : "Google Calendar"}
        </h2>
        <p {...stylex.props(styles.body)}>{describe(status)}</p>
        {connected ? (
          <p {...stylex.props(styles.body)}>
            Disconnecting removes Google’s events from this Mac. They stay in
            Google Calendar. Changes not yet synced are lost.
          </p>
        ) : null}
        {error === null ? null : (
          <p {...stylex.props(styles.body, styles.problem)}>{error}</p>
        )}
      </Dialog>
    </>
  );
};
