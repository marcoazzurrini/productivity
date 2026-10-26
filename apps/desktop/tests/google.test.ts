// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { encryptedFile, listenForRedirect } from "../src/main/google.ts";
import type { Encryption } from "../src/main/google.ts";

const directories: string[] = [];

const tempFile = (): string => {
  const directory = mkdtempSync(path.join(tmpdir(), "productivity-google-"));

  directories.push(directory);

  return path.join(directory, "google.token");
};

/** Reversible and obviously not plain text, like the keychain's cipher. */
const fakeEncryption = (available = true): Encryption => ({
  decryptString: (data) =>
    data.toString("utf-8").split("").toReversed().join(""),
  encryptString: (text) => Buffer.from(text.split("").toReversed().join("")),
  isEncryptionAvailable: () => available,
});

describe(encryptedFile, () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("keeps the token encrypted on disk across launches", () => {
    const file = tempFile();

    encryptedFile(file, fakeEncryption()).write("refresh-token");

    expect(readFileSync(file, "utf-8")).not.toContain("refresh-token");
    expect(encryptedFile(file, fakeEncryption()).read()).toBe("refresh-token");
  });

  it("deletes the file when the token is cleared", () => {
    const file = tempFile();
    const secrets = encryptedFile(file, fakeEncryption());

    secrets.write("refresh-token");
    secrets.write(null);

    expect(existsSync(file)).toBeFalsy();
    expect(secrets.read()).toBeNull();
  });

  it("writes nothing to disk without encryption", () => {
    const file = tempFile();
    const secrets = encryptedFile(file, fakeEncryption(false));

    secrets.write("refresh-token");

    expect(existsSync(file)).toBeFalsy();
    // It still works for this launch.
    expect(secrets.read()).toBe("refresh-token");
  });
});

describe(listenForRedirect, () => {
  it("hands over the query of Google's redirect, then stops", async () => {
    const listener = await listenForRedirect();

    expect(listener.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);

    const icon = await fetch(`${listener.redirectUri}/favicon.ico`);
    const page = await fetch(`${listener.redirectUri}/?code=abc&state=xyz`);

    expect(icon.status).toBe(404);
    await expect(page.text()).resolves.toContain("You can close this tab");

    const query = await listener.result;

    expect(query.get("code")).toBe("abc");
    expect(query.get("state")).toBe("xyz");
  });
});
