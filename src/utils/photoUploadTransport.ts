import type { PendingPhoto } from './storageManager';

type CallableResult = { data?: { success?: boolean; driveId?: string; error?: string } };
type CallableInvoker = (data: Record<string, unknown>) => Promise<CallableResult>;

export async function uploadPendingPhotoWithFirebase(invoke: CallableInvoker, photo: PendingPhoto) {
    const response = await invoke({
        id: photo.id,
        municipio: photo.municipio,
        pozoId: photo.pozoId,
        barrio: photo.barrio,
        filename: photo.filename,
        base64: photo.blob,
        md5: photo.md5,
        categoria: photo.categoria,
        inspector: photo.inspector,
    });
    if (!response.data?.success || !response.data.driveId) {
        throw new Error(response.data?.error || 'Firebase no confirmó la subida de la foto');
    }
    return { driveId: response.data.driveId };
}
