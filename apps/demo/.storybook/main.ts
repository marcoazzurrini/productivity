import type { StorybookConfig } from "@storybook/react-vite";
import stylex from "@stylexjs/unplugin/vite";

const config: StorybookConfig = {
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  core: { disableTelemetry: true },
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../src/**/*.mdx", "../src/**/*.stories.tsx"],
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [stylex({ useCSSLayers: true }), ...(viteConfig.plugins ?? [])],
  }),
};

export default config;
