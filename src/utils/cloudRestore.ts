type FichaLike = { id?: string | null; synced?: boolean; deleted?: boolean };
type RemoteFicha<T extends FichaLike> = { firestoreId: string; data: T };

export function mergeCloudFichas<T extends FichaLike>(
    local: Record<string, T>,
    remote: RemoteFicha<T>[],
): Record<string, T & FichaLike> {
    const merged = { ...local };
    for (const { firestoreId, data } of remote) {
        if (!data || data.deleted) continue;
        const id = data.id || firestoreId;
        const current = merged[id];
        if (current && current.synced === false) continue;
        merged[id] = { ...data, id, synced: true };
    }
    return merged as Record<string, T & FichaLike>;
}
