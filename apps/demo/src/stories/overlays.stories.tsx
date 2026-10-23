import {
  Button,
  Dialog,
  Kbd,
  TextField,
  ToastProvider,
  useToast,
} from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

const meta = { title: "Components/Overlays" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const CaptureDialog = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
        shortcut="⌘N"
        variant="primary"
      >
        New to-do
      </Button>
      <Dialog
        footer={
          <span style={{ color: "#91918E", fontSize: 12 }}>
            <Kbd>↵</Kbd> Save to Inbox
          </span>
        }
        onOpenChange={setOpen}
        open={open}
        title="Capture"
      >
        <TextField
          appearance="bare"
          autoFocus
          hideLabel
          label="What's on your mind?"
          onValueChange={setTitle}
          placeholder="What's on your mind?"
          value={title}
        />
      </Dialog>
    </>
  );
};

export const QuickCapture: Story = { render: () => <CaptureDialog /> };

const ToastButton = () => {
  const toast = useToast();

  return (
    <Button
      onClick={() => {
        toast({
          action: { label: "Undo", onAction: fn() },
          title:
            'Added "Email Eric about final budget numbers" to Next Actions',
        });
      }}
      variant="outline"
    >
      Follow up
    </Button>
  );
};

export const Toast: Story = {
  render: () => (
    <ToastProvider>
      <ToastButton />
    </ToastProvider>
  ),
};
