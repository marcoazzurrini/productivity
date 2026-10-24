import { describe, expect, it } from "vitest";

import { canOpenExternally } from "../src/main/external-links.ts";

describe(canOpenExternally, () => {
  it("opens web and email links", () => {
    expect(canOpenExternally("https://gettingthingsdone.com")).toBeTruthy();
    expect(canOpenExternally("mailto:marco@example.com")).toBeTruthy();
  });

  it("refuses links that could run something on this Mac", () => {
    expect(
      canOpenExternally("file:///Applications/Calculator.app")
    ).toBeFalsy();
    expect(canOpenExternally("smb://attacker.example/share")).toBeFalsy();
    expect(canOpenExternally("productivity://sign-in?code=x")).toBeFalsy();
    expect(canOpenExternally("http://example.com")).toBeFalsy();
  });

  it("refuses text that is not a URL", () => {
    expect(canOpenExternally("not a url")).toBeFalsy();
  });
});
