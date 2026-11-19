interface GasUploadPayload {
  municipio: string;
  pozoId: string;
  filename: string;
  base64: string;
}

interface GasResponse {
  success?: boolean;
  fileId?: string;
  error?: string;
}

export type GasFetch = (
  url: string,
  init: {method: string; body: string; redirect: "follow"}
) => Promise<{ok: boolean; json: () => Promise<GasResponse>}>;

export async function uploadPhotoViaGas(
  url: string,
  token: string,
  photo: GasUploadPayload,
  fetcher: GasFetch = fetch
): Promise<string> {
  const response = await fetcher(url.trim(), {
    method: "POST",
    redirect: "follow",
    body: JSON.stringify({
      token: token.trim(),
      municipio: photo.municipio,
      pozoId: photo.pozoId,
      barrio: "CATASTRO",
      filename: photo.filename,
      base64: photo.base64,
    }),
  });
  if (!response.ok) throw new Error("Apps Script no respondió correctamente");
  const result = await response.json();
  if (!result.success || !result.fileId) {
    throw new Error(result.error || "Apps Script no devolvió el archivo");
  }
  return result.fileId;
}
