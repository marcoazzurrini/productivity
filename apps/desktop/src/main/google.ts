import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import type { RedirectListener, SecretStore } from "@productivity/calendar";

/** What Electron offers for encrypting secrets with the user's keychain. */
export interface Encryption {
  isEncryptionAvailable: () => boolean;
  encryptString: (text: string) => Buffer;
  decryptString: (data: Buffer) => string;
}

/**
 * Keeps Google's refresh token in a file, encrypted with a key from the
 * macOS keychain. Without encryption it keeps nothing, so the user signs in
 * again on each launch rather than leaving the token readable on disk.
 */
export const encryptedFile = (
  file: string,
  encryption: Encryption
): SecretStore => {
  let memory: string | null = null;

  return {
    read: () => {
      if (memory !== null) {
        return memory;
      }

      if (!existsSync(file) || !encryption.isEncryptionAvailable()) {
        return null;
      }

      try {
        memory = encryption.decryptString(readFileSync(file));
      } catch {
        // A file from another Mac or keychain cannot be read: sign in again.
        return null;
      }

      return memory;
    },
    write: (value) => {
      memory = value;

      if (value === null) {
        rmSync(file, { force: true });
      } else if (encryption.isEncryptionAvailable()) {
        writeFileSync(file, encryption.encryptString(value), { mode: 0o600 });
      }
    },
  };
};

const replyPage = `<!doctype html>
<meta charset="utf-8">
<title>Productivity</title>
<body style="font: 15px -apple-system, sans-serif; padding: 48px; color: #191918">
<h1 style="font-size: 20px">You can close this tab</h1>
<p>Go back to Productivity to see your calendar.</p>
</body>`;

/**
 * A one-shot HTTP server on 127.0.0.1 and a free port, for Google's
 * redirect after sign-in. It answers the first request, then stops.
 */
export const listenForRedirect = (): Promise<RedirectListener> => {
  const listening = Promise.withResolvers<RedirectListener>();
  const redirect = Promise.withResolvers<URLSearchParams>();

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    // Browsers also ask for /favicon.ico; only the redirect counts.
    if (url.pathname !== "/") {
      response.writeHead(404).end();

      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(replyPage);
    redirect.resolve(url.searchParams);
    server.close();
  });

  server.once("error", listening.reject);
  server.listen(0, "127.0.0.1", () => {
    // SAFETY: a TCP server listening on a host and port has this address shape.
    const { port } = server.address() as AddressInfo;

    listening.resolve({
      close: () => {
        server.close();
      },
      redirectUri: `http://127.0.0.1:${port}`,
      result: redirect.promise,
    });
  });

  return listening.promise;
};
