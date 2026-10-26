/**
 * Google sign-in for a desktop app (RFC 8252): the system browser shows
 * Google's consent page and redirects to a one-shot HTTP listener on the
 * loopback interface. PKCE ties the redirect to this app instance.
 * https://developers.google.com/identity/protocols/oauth2/native-app
 */

const authorizeUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenUrl = "https://oauth2.googleapis.com/token";
const revokeUrl = "https://oauth2.googleapis.com/revoke";

/** Read the calendar list, and read and write events. Nothing else. */
export const googleScopes = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

/** How long to wait for the user to finish signing in. */
const signInTimeoutMs = 5 * 60 * 1000;

/** The part of fetch the Google calls use. */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** The Google Cloud OAuth client, of type "Desktop app". */
export interface GoogleClient {
  clientId: string;
  /** Google issues one to desktop clients, but cannot keep it secret. */
  clientSecret?: string;
}

/** Keeps the refresh token between launches. The app encrypts it. */
export interface SecretStore {
  read: () => string | null;
  write: (value: string | null) => void;
}

/** A one-shot HTTP listener on 127.0.0.1 that receives Google's redirect. */
export interface RedirectListener {
  /** Such as "http://127.0.0.1:53682". */
  redirectUri: string;
  /** Resolves with the query string of the first request it receives. */
  result: Promise<URLSearchParams>;
  close: () => void;
}

export interface SignInDevices {
  openBrowser: (url: string) => Promise<void> | void;
  listenForRedirect: () => Promise<RedirectListener>;
}

export class GoogleAuthError extends Error {
  /** Google refused the refresh token: the user revoked access or it expired. */
  readonly signedOut: boolean;

  constructor(message: string, signedOut = false) {
    super(message);
    this.name = "GoogleAuthError";
    this.signedOut = signedOut;
  }
}

const signedOut = (): GoogleAuthError =>
  new GoogleAuthError(
    "Google signed this app out. Connect again to keep syncing.",
    true
  );

const ignore = (): void => undefined;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCodePoint(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/[=]+$/u, "");

const randomToken = (): string =>
  base64Url(crypto.getRandomValues(new Uint8Array(32)));

const challengeOf = async (verifier: string): Promise<string> =>
  base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
    )
  );

/** Rejects after `ms` unless cancelled first. */
const deadline = (ms: number) => {
  const { promise, reject } = Promise.withResolvers<never>();

  const timer = setTimeout(() => {
    reject(new GoogleAuthError("Signing in to Google took too long."));
  }, ms);

  return {
    cancel: () => {
      clearTimeout(timer);
    },
    expired: promise,
  };
};

/** Rejects when the signal aborts, even if it already has. */
const cancelled = (signal: AbortSignal): Promise<never> => {
  const { promise, reject } = Promise.withResolvers<never>();

  const cancel = (): void => {
    reject(new GoogleAuthError("Signing in to Google was cancelled."));
  };

  if (signal.aborted) {
    cancel();
  } else {
    signal.addEventListener("abort", cancel, { once: true });
  }

  // Callers race this promise; a late abort must not surface as unhandled.
  promise.catch(ignore);

  return promise;
};

export interface Session {
  /** A valid access token, refreshed when it is about to expire. */
  accessToken: () => Promise<string>;
  /** Forgets the cached access token, so the next call refreshes it. */
  invalidate: () => void;
}

export interface OAuth {
  isSignedIn: () => boolean;
  /** Runs the browser sign-in and keeps the refresh token. */
  signIn: (devices: SignInDevices, signal: AbortSignal) => Promise<void>;
  /** Revokes access at Google, best effort, and forgets the tokens. */
  signOut: () => Promise<void>;
  session: Session;
}

export const createOAuth = ({
  client,
  secrets,
  fetch,
  clock,
}: {
  client: GoogleClient;
  secrets: SecretStore;
  fetch: Fetch;
  clock: () => Date;
}): OAuth => {
  let access: { token: string; expiresAt: number } | null = null;

  const requestToken = async (
    fields: Record<string, string>
  ): Promise<TokenResponse> => {
    const body = new URLSearchParams({ client_id: client.clientId, ...fields });

    if (client.clientSecret !== undefined) {
      body.set("client_secret", client.clientSecret);
    }

    const response = await fetch(tokenUrl, {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    // SAFETY: Google's token endpoint always answers with this JSON shape.
    return (await response.json()) as TokenResponse;
  };

  const remember = (response: TokenResponse): void => {
    if (response.access_token !== undefined) {
      // Refresh a minute early, so a token never expires mid-request.
      access = {
        expiresAt:
          clock().getTime() + ((response.expires_in ?? 3600) - 60) * 1000,
        token: response.access_token,
      };
    }
  };

  const refresh = async (): Promise<string> => {
    const refreshToken = secrets.read();

    if (refreshToken === null) {
      throw signedOut();
    }

    const response = await requestToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    if (response.error === "invalid_grant") {
      secrets.write(null);
      throw signedOut();
    }

    remember(response);

    if (access === null) {
      throw new GoogleAuthError(
        response.error_description ?? "Google did not issue an access token."
      );
    }

    return access.token;
  };

  return {
    isSignedIn: () => secrets.read() !== null,

    session: {
      accessToken: () =>
        access !== null && access.expiresAt > clock().getTime()
          ? Promise.resolve(access.token)
          : refresh(),
      invalidate: () => {
        access = null;
      },
    },

    signIn: async (devices, signal) => {
      const aborted = cancelled(signal);

      const listener = await Promise.race([
        devices.listenForRedirect(),
        aborted,
      ]);

      try {
        const verifier = randomToken();
        const state = randomToken();
        const url = new URL(authorizeUrl);

        url.search = new URLSearchParams({
          access_type: "offline",
          client_id: client.clientId,
          code_challenge: await challengeOf(verifier),
          code_challenge_method: "S256",
          // Asks again for consent, so Google always issues a refresh token.
          prompt: "consent",
          redirect_uri: listener.redirectUri,
          response_type: "code",
          scope: googleScopes.join(" "),
          state,
        }).toString();

        await Promise.race([devices.openBrowser(url.toString()), aborted]);

        const limit = deadline(signInTimeoutMs);
        let query: URLSearchParams;

        try {
          query = await Promise.race([listener.result, aborted, limit.expired]);
        } finally {
          limit.cancel();
        }

        if (query.get("state") !== state) {
          throw new GoogleAuthError(
            "Google's reply did not match this sign-in."
          );
        }

        const code = query.get("code");

        if (code === null) {
          throw new GoogleAuthError(
            query.get("error") === "access_denied"
              ? "Google access was not granted."
              : "Google did not finish signing in."
          );
        }

        const response = await requestToken({
          code,
          code_verifier: verifier,
          grant_type: "authorization_code",
          redirect_uri: listener.redirectUri,
        });

        if (response.refresh_token === undefined) {
          throw new GoogleAuthError(
            response.error_description ??
              "Google did not issue a refresh token."
          );
        }

        secrets.write(response.refresh_token);
        remember(response);
      } finally {
        listener.close();
      }
    },

    signOut: async () => {
      const token = secrets.read();

      secrets.write(null);
      access = null;

      if (token !== null) {
        try {
          await fetch(revokeUrl, {
            body: new URLSearchParams({ token }),
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          });
        } catch {
          // Offline: the token is forgotten here, and the user can still
          // remove the app at myaccount.google.com.
        }
      }
    },
  };
};
