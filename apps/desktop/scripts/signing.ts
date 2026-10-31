import { $ } from "bun";

/**
 * Signs the app with the "Apple Development" certificate of the Apple ID
 * signed in to Xcode, which is free.
 *
 * macOS lets an app read its keychain items, such as the key that encrypts
 * the Google sign-in, only while the app belongs to the same "partition" as
 * when it saved them. Without an Apple team, that partition is a hash of the
 * app's files, so every build was a stranger and lost the Google sign-in.
 * Signed by a team, the partition is the team ID, which every build shares.
 */

const certificatePrefix = "Apple Development:";

const setupHelp = `No valid "Apple Development" certificate in your keychain.

The app needs one so the keychain keeps trusting each new build:
  1. Install Xcode from the App Store.
  2. In Xcode, open Settings, then Apple Accounts, and sign in.
  3. Open your Personal Team, click Manage Certificates, then + and
     Apple Development.

If the certificate is there but not valid, install Apple's current
intermediate certificate, "AppleWWDRCAG3.cer", from
https://www.apple.com/certificateauthority/
`;

/** The name of the first valid Apple Development identity, or null. */
const findIdentity = async (): Promise<string | null> => {
  const listing = await $`security find-identity -v -p codesigning`.text();

  for (const line of listing.split("\n")) {
    const name = /"(?<name>[^"]+)"/u.exec(line)?.groups?.name;

    if (name?.startsWith(certificatePrefix) === true) {
      return name;
    }
  }

  return null;
};

/** Signs `app` in place with the Apple Development certificate. */
export const signApp = async (app: string): Promise<void> => {
  const identity = await findIdentity();

  if (identity === null) {
    throw new Error(setupHelp);
  }

  process.stdout.write(`With ${identity}\n`);

  await $`codesign --force --deep --sign ${identity} ${app}`.quiet();
  await $`codesign --verify --deep --strict ${app}`.quiet();
};
