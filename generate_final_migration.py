import firebase_admin
from firebase_admin import credentials, firestore
import unicodedata
import os

# Connect to DB using available credentials
# The user usually passes the path to the credentials json file.
# Let's prompt them or just use the default application credentials if none passed in env.
def norm(t):
    if not t: return ""
    t = unicodedata.normalize('NFD', t)
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn').upper()

def run_audit(path):
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        return
        
    firebase_admin.initialize_app(credentials.Certificate(path))
    db = firestore.client()
    
    dirty = []
    
    collections = ['fichas', 'historial_fichas', 'marcaciones', 'historial_marcaciones']
    
    for coll in collections:
        docs = db.collection(coll).stream()
        for doc in docs:
            doc_id = doc.id
            mun_field = doc.to_dict().get('municipio', '')
            
            norm_id = norm(doc_id)
            norm_mun = norm(mun_field)
            
            has_accent_in_id = any(c in doc_id for c in 'ÁÉÍÓÚáéíóúÑñ')
            has_lowercase_in_id = doc_id != doc_id.upper() if not has_accent_in_id else True
            field_dirty = mun_field != norm_mun
            
            if has_accent_in_id or has_lowercase_in_id or field_dirty:
                dirty.append((coll, doc_id, norm_id, norm_mun))
                
    # Generate the migration script content
    script_content = """import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

DRY_RUN = True  
LOG_FILE = "migration_final_cleanup_log.txt"

MIGRATION_LIST = [
"""
    for coll, old_id, new_id, mun in sorted(dirty, key=lambda x: (x[0], x[3])):
        script_content += f'    ("{coll}", "{old_id}", "{new_id}", "{mun}"),\n'
        
    script_content += """]

def log(m):
    t = datetime.now().strftime("%H:%M:%S")
    msg = f"[{t}] {m}"
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f: f.write(msg + "\\n")

def run():
    path = input("Ruta al JSON de cuenta de servicio: ").strip('"')
    if not os.path.exists(path): return print("Archivo no encontrado.")
    firebase_admin.initialize_app(credentials.Certificate(path))
    db = firestore.client()
    s = {"ok": 0, "err": 0}

    for coll, old_id, new_id, mun in MIGRATION_LIST:
        try:
            old_ref = db.collection(coll).document(old_id)
            doc = old_ref.get()
            if not doc.exists:
                log(f"SKIP | {old_id} (No existe en DB)")
                continue
            data = doc.to_dict()
            data['municipio'] = mun
            data['migratedFrom'] = old_id
            data['migratedAt'] = datetime.now().isoformat()
            if DRY_RUN:
                log(f"SIM | {coll} | {old_id} -> {new_id} (LISTO)")
                s["ok"] += 1
            else:
                new_ref = db.collection(coll).document(new_id)
                new_ref.set(data)
                if new_ref.get().exists:
                    if old_id != new_id: old_ref.delete()
                    log(f"OK | {coll} | {old_id} -> {new_id}")
                    s["ok"] += 1
                else: log(f"ERR | Error al escribir {new_id}")
        except Exception as e:
            log(f"ERR | {old_id} | {str(e)}")
            s["err"] += 1
    print(f"\\nFINALIZADO: {s['ok']} OK, {s['err']} ERR. Revisa {LOG_FILE}")

if __name__ == "__main__": run()
"""
    with open('firestore_FINAL_CLEANUP.py', 'w', encoding='utf-8') as f:
        f.write(script_content)
        
    print(f"DONE! Found {len(dirty)} records. Created firestore_FINAL_CLEANUP.py")

if __name__ == "__main__":
    path = input("Ruta al JSON de cuenta de servicio: ").strip('"')
    run_audit(path)
