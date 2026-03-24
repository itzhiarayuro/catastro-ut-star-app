import json
import os
import re

def normalize_name(name):
    if not name: return ""
    # Remove accents
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

def analyze_docs(file_paths, collection_name):
    results = []
    expected_municipios = ["GRANADA", "MARINILLA", "SIBATE", "SOPO"]
    
    # Track unique IDs to avoid duplicate results across pages (though Firestore pagination shouldn't duplicate)
    seen_ids = set()

    for path in file_paths:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                continue
            docs = data.get("documents", [])
            for doc in docs:
                fullname = doc.get("name", "")
                doc_id = fullname.split('/')[-1]
                
                if doc_id in seen_ids: continue
                seen_ids.add(doc_id)

                municipio_raw = get_field(doc, "municipio")
                municipio_norm = normalize_name(municipio_raw)
                pozo = get_field(doc, "pozo") or get_field(doc, "codigo")
                
                # Check for target municipios
                is_target = False
                expected_m = ""
                for m in expected_municipios:
                    if m in municipio_norm or m in normalize_name(doc_id):
                        is_target = True
                        expected_m = m
                        break
                
                if is_target:
                    # Logic for expected ID
                    expected_id = ""
                    if collection_name == "fichas":
                        expected_id = f"{expected_m}_{pozo}"
                    else:
                        # historial usually is MUN_POZO_VERSION
                        parts = doc_id.split('_')
                        if len(parts) >= 3:
                            expected_id = f"{expected_m}_{pozo}_{parts[-1]}"
                        else:
                            expected_id = f"{expected_m}_{pozo}_FIXED"

                    # Needs migration if either field or ID is wrong
                    needs_migration = (municipio_raw != expected_m) or (doc_id != expected_id)
                    
                    if needs_migration:
                        results.append({
                            "C": collection_name,
                            "ID": doc_id,
                            "M_ACT": municipio_raw,
                            "M_ESP": expected_m,
                            "ID_ESP": expected_id
                        })
    return results

fichas_paths = [
    r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\167\output.txt",
    r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\221\output.txt"
]

historial_paths = [
    r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\257\output.txt",
    r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\269\output.txt",
    r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\278\output.txt"
]

all_results = analyze_docs(fichas_paths, "fichas") + analyze_docs(historial_paths, "historial_fichas")

print("| COLECCIÓN | ID_ACTUAL | MUNICIPIO_ACTUAL | MUNICIPIO_ESPERADO | ID_ESPERADO | ACCIÓN |")
print("|---|---|---|---|---|---|")
for row in all_results:
    print(f"| {row['C']} | {row['ID']} | {row['M_ACT']} | {row['M_ESP']} | {row['ID_ESP']} | MIGRAR |")
