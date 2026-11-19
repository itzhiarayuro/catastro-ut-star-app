interface AuditUser { uid: string; email: string | null; displayName: string | null }

export const buildFichaAudit = (ficha: Record<string, unknown>, user: AuditUser | null) => {
    if (!user) return {};
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0] || 'Desconocido';
    return {
        createdBy: ficha.createdBy || user.uid,
        creatorEmail: ficha.creatorEmail || email,
        creatorDisplayName: ficha.creatorDisplayName || displayName,
        lastEditedBy: user.uid,
        lastEditorEmail: email,
        lastEditorDisplayName: displayName,
    };
};
