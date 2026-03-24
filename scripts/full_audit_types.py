import json
import os

def normalize_name(name):
    if not name: return ""
    name = name.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
    name = name.replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U')
    return name.upper().strip()

def get_field(doc, field_name):
    fields = doc.get("fields", {})
    if field_name not in fields: return ""
    f = fields[field_name]
    if "stringValue" in f: return f["stringValue"]
    if "integerValue" in f: return str(f["integerValue"])
    if "doubleValue" in f: return str(f["doubleValue"])
    return ""

def process_audit():
    fichas_paths = [
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\167\output.txt",
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\221\output.txt"
    ]
    historial_paths = [
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\257\output.txt",
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\269\output.txt",
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\278\output.txt"
    ]

    docs_pool = []
    for p in fichas_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                docs_pool.append(("fichas", json.load(f).get("documents", [])))
    for p in historial_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                docs_pool.append(("hist_fichas", json.load(f).get("documents", [])))

    expected_municipios = ["GRANADA", "MARINILLA", "SIBATE", "SOPO"]
    
    type_a = []
    type_b = []
    
    seen_ids = set()

    for coll_name, docs in docs_pool:
        for doc in docs:
            fullname = doc.get("name", "")
            doc_id = fullname.split('/')[-1]
            key = f"{coll_name}:{doc_id}"
            if key in seen_ids: continue
            seen_ids.add(key)
            
            m_raw = get_field(doc, "municipio")
            m_norm = normalize_name(m_raw)
            pozo = get_field(doc, "pozo") or get_field(doc, "codigo")
            
            # Find target
            match_m = ""
            for target in expected_municipios:
                if target in m_norm or target in normalize_name(doc_id):
                    match_m = target
                    break
            
            if match_m:
                # Expected ID logic
                if coll_name == "fichas":
                    expected_id = f"{match_m}_{pozo}"
                else:
                    parts = doc_id.split('_')
                    if len(parts) >= 3:
                        expected_id = f"{match_m}_{pozo}_{parts[-1]}"
                    else:
                        expected_id = f"{match_m}_{pozo}_FIXED"
                
                # Classification
                if doc_id == expected_id:
                    if m_raw != match_m:
                        type_a.append([coll_name, doc_id, m_raw, match_m])
                else:
                    type_b.append([coll_name, doc_id, m_raw, match_m, expected_id])

    print("--- REPORTE TIPO A (Actualizar Campo) ---")
    print(f"Total: {len(type_a)}")
    print("| COLECCIÓN | ID ACTUAL (OK) | MUN. CAMPO | MUN. ESPERADO | ACCIÓN |")
    print("|---|---|---|---|---|")
    for r in type_a:
        print(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | UPDATE_FIELD |")

    print("\n--- REPORTE TIPO B (Recrear Documento) ---")
    print(f"Total: {len(type_b)}")
    print("| COLECCIÓN | ID ACTUAL (CORREGIR) | MUN. CAMPO | MUN. ESPERADO | ID ESPERADO | ACCIÓN |")
    print("|---|---|---|---|---|---|")
    for r in type_b:
        print(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | RECREATE_DOC |")

process_audit()
