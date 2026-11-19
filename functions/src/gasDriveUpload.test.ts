import {strictEqual} from "node:assert/strict";
import {test} from "node:test";

import {uploadPhotoViaGas} from "./gasDriveUpload";

test("returns the Drive id produced by the authorized Apps Script", async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({success: true, fileId: "drive-file-id"}),
  });

  const driveId = await uploadPhotoViaGas(
    "https://example.test/exec",
    "secret",
    {municipio: "QUIPILE", pozoId: "PZ005", filename: "PZ005-T.JPG", base64: "abc"},
    fakeFetch
  );

  strictEqual(driveId, "drive-file-id");
});

test("rejects an Apps Script response without a successful file id", async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({success: false, error: "Drive denied"}),
  });

  strictEqual(
    await uploadPhotoViaGas(
      "https://example.test/exec",
      "secret",
      {municipio: "QUIPILE", pozoId: "PZ005", filename: "PZ005-T.JPG", base64: "abc"},
      fakeFetch
    ).then(() => "resolved", (error) => error.message),
    "Drive denied"
  );
});
