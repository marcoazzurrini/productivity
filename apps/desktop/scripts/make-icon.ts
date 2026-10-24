import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Turns resources/icon.svg into resources/icon.icns, the macOS app icon.
 * Uses tools that ship with macOS: Quick Look renders the SVG, sips resizes
 * it and iconutil packs the sizes. Run it after editing icon.svg.
 *
 * Usage: bun run make-icon
 */
import { $ } from "bun";

const resources = path.resolve(import.meta.dir, "..", "resources");
const source = path.join(resources, "icon.svg");
const target = path.join(resources, "icon.icns");

/** Every size an .icns holds, each at 1x and 2x. */
const sizes = [16, 32, 128, 256, 512];

if (process.platform !== "darwin") {
  throw new Error("make-icon uses macOS tools and only runs on a Mac.");
}

const work = mkdtempSync(path.join(tmpdir(), "productivity-icon-"));
const iconset = path.join(work, "icon.iconset");

try {
  await $`qlmanage -t -s 1024 -o ${work} ${source}`.quiet();
  await $`mkdir ${iconset}`;

  const master = path.join(work, "icon.svg.png");

  const resize = (pixels: number, name: string) =>
    $`sips -z ${pixels} ${pixels} ${master} --out ${path.join(iconset, name)}`.quiet();

  await Promise.all(
    sizes.flatMap((size) => [
      resize(size, `icon_${size}x${size}.png`),
      resize(size * 2, `icon_${size}x${size}@2x.png`),
    ])
  );

  await $`iconutil -c icns ${iconset} -o ${target}`;
  process.stdout.write(`Saved ${target}\n`);
} finally {
  rmSync(work, { force: true, recursive: true });
}
