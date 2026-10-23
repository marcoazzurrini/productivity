import "@productivity/ui/base.css";
import type { Preview } from "@storybook/react-vite";

if (import.meta.env.DEV) {
  // Live StyleX CSS while developing. Static builds bundle the CSS.
  await import("virtual:stylex:runtime");
}

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    backgrounds: {
      options: {
        page: { name: "Page", value: "#FFFFFF" },
        sidebar: { name: "Sidebar", value: "#F8F8F7" },
      },
    },
    controls: { expanded: true },
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default preview;
