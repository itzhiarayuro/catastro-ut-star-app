import json
import os
from collections import Counter

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

def process_collections():
    fichas_paths = [
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\167\output.txt",
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\221\output.txt"
    ]
    historial_paths = [
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\257\output.txt",
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\269\output.txt",
        r"C:\Users\ICA2025\.gemini\antigravity\brain\6433cf92-c1ae-446d-9cb6-1d5ad11402e6\.system_generated\steps\278\output.txt"
    ]

    all_fichas_docs = []
    for p in fichas_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_fichas_docs.extend(data.get("documents", []))

    all_hist_docs = []
    for p in historial_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_hist_docs.extend(data.get("documents", []))

    # Task 3: Granada and Sibate in fichas + Distinct
    fichas_municipios = []
    for doc in all_fichas_docs:
        m = get_field(doc, "municipio")
        fichas_municipios.append(m)
    
    distinct_m = Counter(fichas_municipios)
    
    print("--- RESUMEN DE MUNICIPIOS EN 'fichas' ---")
    print(f"Total documentos analizados: {len(all_fichas_docs)}")
    print("Municipios encontrados (conteo):")
    for m, count in distinct_m.items():
        print(f" - {m}: {count}")
    
    # Task 1 & 2: Complete table
    # Lista de colecciones a auditar
    collections = [
        "fichas",
        "historial_fichas",
        "marcaciones",
        "historial_marcaciones"
    ]
    
    report_rows = []
    
    for coll in collections:
        print(f"Auditando colección: {coll}...")
        docs = list_all_documents(coll)
        print(f"Encontrados {len(docs)} documentos en {coll}.")
        
        for doc in docs:
            fields = doc.get("fields", {})
            full_name = doc.get("name", "")
            doc_id = full_name.split("/")[-1]
            
            # Campo municipio (puede variar según la colección, pero suele ser 'municipio')
            current_mun = fields.get("municipio", {}).get("stringValue", "")
            
            # Normalización
            normalized_mun = normalize_municipio(current_mun)
            
            # Determinar si requiere migración
            # Tipo A: Campo municipio mal
            # Tipo B: ID mal (contiene tilde o minúscula)
            
            needs_migration = False
            
            # 1. Verificar tildes o minúsculas en el ID
            if not doc_id.isupper() or any(char in doc_id for char in "ÁÉÍÓÚáéíóú"):
                needs_migration = True
            
            # 2. Verificar el campo municipio
            if current_mun != normalized_mun:
                needs_migration = True

            if needs_migration:
                # Construir el ID esperado
                # Para historial suele ser MUNICIPIO_POZO_TIMESTAMP
                # Para marcaciones suele ser MUNICIPIO_CODIGO
                
                # Intentamos derivar el nuevo ID reemplazando tildes en el viejo
                expected_id = normalize_municipio(doc_id)
                
                report_rows.append({
                    "coleccion": coll,
                    "id_actual": doc_id,
                    "mun_actual": current_mun,
                    "mun_esperado": normalized_mun,
                    "id_esperado": expected_id,
                    "accion": "MIGRAR"
                })

    # Generar tabla Markdown
    print("\n--- REPORTE COMPLETO DE MIGRACIÓN ---")
    print("| COLECCIÓN | ID ACTUAL | MUN. CAMPO | MUN. ESPERADO | ID ESPERADO | ACCIÓN |")
    print("|---|---|---|---|---|---|")
    for row in report_rows:
        print(f"| {row['coleccion']} | {row['id_actual']} | {row['mun_actual']} | {row['mun_esperado']} | {row['id_esperado']} | {row['accion']} |")

if __name__ == "__main__":
    main()
