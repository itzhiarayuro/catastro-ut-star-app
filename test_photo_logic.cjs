
function findPhotoByCode(pozo, targetCode) {
    if (!pozo.fotoList) return null;
    const upperTarget = targetCode.toUpperCase();
    const pozoId = String(pozo.pozo || '').toUpperCase();
    const cleanPozoId = pozoId;

    const getPriority = (f) => {
        if (!f) return -1;
        const fname = String(f.filename || f.name || f.id || '').toUpperCase();
        const sub = String(f.subcategoria || '').toUpperCase();
        const type = String(f.tipo || '').toUpperCase();

        if (upperTarget === 'T') {
            const isPipeTapa = fname.includes('-E') || fname.includes('-S') || fname.includes('-SUM');
            if (isPipeTapa) return -1;
            if (sub === 'T') return 100;
            if (fname.includes(`-${upperTarget}.`) || fname.includes(`_${upperTarget}.`)) return 50;
            return -1;
        }

        const hasPozo = fname.includes(cleanPozoId) || fname.includes(pozoId);
        const hasCodeInFilename = fname.includes(`-${upperTarget}.`) || fname.includes(`_${upperTarget}.`) 
                     || fname.includes(`-${upperTarget}-`) || fname.includes(`_${upperTarget}-`);
        
        if (sub === upperTarget || (hasPozo && hasCodeInFilename)) {
            if (type === 'TUBERIA_TAPA' || fname.includes('-T.')) return 100;
            if (type === 'SUMIDERO' || type === 'DETALLE' || fname.includes('-D.')) return 80;
            if (type === 'MEDICION' || fname.includes('-Z.')) return 50;
            return 10;
        }

        return -1;
    };

    const candidates = pozo.fotoList
        .map(f => ({ photo: f, priority: getPriority(f) }))
        .filter(c => c.priority > 0)
        .sort((a, b) => b.priority - a.priority);
    
    return candidates.length > 0 ? candidates[0].photo : null;
}

const pozoPZ001 = {
    pozo: "PZ001",
    fotoList: [
        { filename: "PZ001-E1-Z.JPG", subcategoria: "E1-Z", tipo: "MEDICION" },
        { filename: "PZ001-S1-Z.JPG", subcategoria: "S1-Z", tipo: "MEDICION" },
        { filename: "PZ001-E1-T.JPG", subcategoria: "E1", tipo: "TUBERIA_TAPA" },
        { filename: "PZ001-E1-D.JPG", subcategoria: "", tipo: "SUMIDERO" },
        { filename: "PZ001-S1-T.JPG", subcategoria: "S1", tipo: "TUBERIA_TAPA" },
        { filename: "PZ001-S1-D.JPG", subcategoria: "", tipo: "SUMIDERO" },
        { filename: "PZ001-S2-T.JPG", subcategoria: "S2", tipo: "TUBERIA_TAPA" },
        { filename: "PZ001-S2-Z.JPG", subcategoria: "S2-Z", tipo: "MEDICION" },
        { filename: "PZ001-S2-D.JPG", subcategoria: "", tipo: "SUMIDERO" },
        { filename: "PZ001-P.JPG", subcategoria: "P", tipo: "GENERAL" },
        { filename: "PZ001-T.JPG", subcategoria: "T", tipo: "TAPA" },
        { filename: "PZ001-I.JPG", subcategoria: "I", tipo: "INTERIOR" }
    ]
};

console.log("Tapa (T):", findPhotoByCode(pozoPZ001, "T")?.filename);
console.log("Salida 2 (S2):", findPhotoByCode(pozoPZ001, "S2")?.filename);
console.log("Salida 1 (S1):", findPhotoByCode(pozoPZ001, "S1")?.filename);
console.log("Entrada 1 (E1):", findPhotoByCode(pozoPZ001, "E1")?.filename);
