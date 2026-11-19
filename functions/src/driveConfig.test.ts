import {strictEqual} from "node:assert/strict";
import {test} from "node:test";

import {normalizeDriveFolderId} from "./driveConfig";

test("removes whitespace accidentally stored in the Drive folder secret", () => {
  strictEqual(
    normalizeDriveFolderId("  folder-id\r\n\r\n", "fallback-id"),
    "folder-id"
  );
});

test("uses and normalizes the fallback when the secret is empty", () => {
  strictEqual(normalizeDriveFolderId("", " fallback-id\n"), "fallback-id");
});
