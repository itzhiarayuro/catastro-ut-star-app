# =================================================================
# SCRIPT DE MIGRACIÓN UNIVERSAL - CATASTRO UT STAR (VERSIÓN 2.0)
# Incluye: Fichas, Historial, Marcaciones e Historial Marcaciones
# =================================================================

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

# --- ⚙️ SEGURIDAD ---
DRY_RUN = False  # <--- CAMBIAR A False DESPUÉS DEL TEST
LOG_FILE = "migration_full_log.txt"

# --- 📊 LISTA MAESTRA DE MIGRACIÓN (TODAS LAS COLECCIONES) ---
# Formato: (coleccion, id_actual, id_nuevo, municipio_nuevo)
MIGRATION_LIST = [
    # === FICHAS (SOPÓ Y OTROS) ===
    ("fichas", "SOPÓ_P01", "SOPO_P01", "SOPO"),
    ("fichas", "SOPÓ_P02", "SOPO_P02", "SOPO"),
    ("fichas", "SOPÓ_P03", "SOPO_P03", "SOPO"),
    ("fichas", "SOPÓ_P04", "SOPO_P04", "SOPO"),
    ("fichas", "SOPÓ_P05", "SOPO_P05", "SOPO"),
    ("fichas", "SOPÓ_P06", "SOPO_P06", "SOPO"),
    ("fichas", "SOPÓ_P07", "SOPO_P07", "SOPO"),
    ("fichas", "SOPÓ_P11", "SOPO_P11", "SOPO"),
    ("fichas", "SOPÓ_P12", "SOPO_P12", "SOPO"),
    ("fichas", "SOPÓ_P200", "SOPO_P200", "SOPO"),
    ("fichas", "SOPÓ_P238", "SOPO_P238", "SOPO"),
    ("fichas", "SOPÓ_P241", "SOPO_P241", "SOPO"),
    ("fichas", "SOPÓ_P245", "SOPO_P245", "SOPO"),
    ("fichas", "SOPÓ_P40", "SOPO_P40", "SOPO"),
    ("fichas", "SOPÓ_P41", "SOPO_P41", "SOPO"),
    ("fichas", "SOPÓ_P59", "SOPO_P59", "SOPO"),
    ("fichas", "SOPÓ_P60", "SOPO_P60", "SOPO"),
    ("fichas", "SOPÓ_P69", "SOPO_P69", "SOPO"),
    ("fichas", "SOPÓ_P70", "SOPO_P70", "SOPO"),
    ("fichas", "SOPÓ_PZ206", "SOPO_PZ206", "SOPO"),
    ("fichas", "SOPÓ_PZ249", "SOPO_PZ249", "SOPO"),
    ("fichas", "SOPÓ_PZ299", "SOPO_PZ299", "SOPO"),
    ("fichas", "SOPÓ_PZ36", "SOPO_PZ36", "SOPO"),
    ("fichas", "SOPÓ_PZ37", "SOPO_PZ37", "SOPO"),
    ("fichas", "SOPÓ_PZ38", "SOPO_PZ38", "SOPO"),
    ("fichas", "SOPÓ_PZ39", "SOPO_PZ39", "SOPO"),
    ("fichas", "SOPÓ_PZ43", "SOPO_PZ43", "SOPO"),
    ("fichas", "SOPÓ_PZ45", "SOPO_PZ45", "SOPO"),
    ("fichas", "SOPÓ_PZ58", "SOPO_PZ58", "SOPO"),

    # === HISTORIAL FICHAS ===
    ("historial_fichas", "SOPÓ_P0000_1772917464137", "SOPO_P0000_1772917464137", "SOPO"),
    ("historial_fichas", "SOPÓ_P01_1773150489507", "SOPO_P01_1773150489507", "SOPO"),
    ("historial_fichas", "SOPÓ_P01_1773155306307", "SOPO_P01_1773155306307", "SOPO"),
    ("historial_fichas", "SOPÓ_P01_1773155361866", "SOPO_P01_1773155361866", "SOPO"),
    ("historial_fichas", "SOPÓ_P01_1773169603924", "SOPO_P01_1773169603924", "SOPO"),
    ("historial_fichas", "SOPÓ_P01_1773169944167", "SOPO_P01_1773169944167", "SOPO"),
    ("historial_fichas", "SOPÓ_P01_1773179308816", "SOPO_P01_1773179308816", "SOPO"),
    ("historial_fichas", "SOPÓ_P02_1773155753244", "SOPO_P02_1773155753244", "SOPO"),
    ("historial_fichas", "SOPÓ_P02_1773179474329", "SOPO_P02_1773179474329", "SOPO"),
    ("historial_fichas", "SOPÓ_P03_1773188874637", "SOPO_P03_1773188874637", "SOPO"),
    ("historial_fichas", "SOPÓ_P04_1773196890039", "SOPO_P04_1773196890039", "SOPO"),
    ("historial_fichas", "SOPÓ_P05_1773197566488", "SOPO_P05_1773197566488", "SOPO"),
    ("historial_fichas", "SOPÓ_P05_1773231070657", "SOPO_P05_1773231070657", "SOPO"),
    ("historial_fichas", "SOPÓ_P061_1772735913530", "SOPO_P061_1772735913530", "SOPO"),
    ("historial_fichas", "SOPÓ_P062_1772735918213", "SOPO_P062_1772735918213", "SOPO"),
    ("historial_fichas", "SOPÓ_P06_1773198618141", "SOPO_P06_1773198618141", "SOPO"),
    ("historial_fichas", "SOPÓ_P07_1773199145207", "SOPO_P07_1773199145207", "SOPO"),
    ("historial_fichas", "SOPÓ_P11_1773285899893", "SOPO_P11_1773285899893", "SOPO"),
    ("historial_fichas", "SOPÓ_P12_1773286092145", "SOPO_P12_1773286092145", "SOPO"),
    ("historial_fichas", "SOPÓ_P200_1773230572146", "SOPO_P200_1773230572146", "SOPO"),
    ("historial_fichas", "SOPÓ_P200_1773572714995", "SOPO_P200_1773572714995", "SOPO"),
    ("historial_fichas", "SOPÓ_P238_1773260389983", "SOPO_P238_1773260389983", "SOPO"),
    ("historial_fichas", "SOPÓ_P238_1773443410715", "SOPO_P238_1773443410715", "SOPO"),
    ("historial_fichas", "SOPÓ_P241_1773199565681", "SOPO_P241_1773199565681", "SOPO"),
    ("historial_fichas", "SOPÓ_P245_1773768934910", "SOPO_P245_1773768934910", "SOPO"),
    ("historial_fichas", "SOPÓ_P40_1773768331204", "SOPO_P40_1773768331204", "SOPO"),
    ("historial_fichas", "SOPÓ_P41_1773774348175", "SOPO_P41_1773774348175", "SOPO"),
    ("historial_fichas", "SOPÓ_P41_1773778353821", "SOPO_P41_1773778353821", "SOPO"),
    ("historial_fichas", "SOPÓ_P59_1773252008946", "SOPO_P59_1773252008946", "SOPO"),
    ("historial_fichas", "SOPÓ_P59_1773252177768", "SOPO_P59_1773252177768", "SOPO"),
    ("historial_fichas", "SOPÓ_P59_1773270483969", "SOPO_P59_1773270483969", "SOPO"),
    ("historial_fichas", "SOPÓ_P59_1773443390611", "SOPO_P59_1773443390611", "SOPO"),
    ("historial_fichas", "SOPÓ_P60_1773241944416", "SOPO_P60_1773241944416", "SOPO"),
    ("historial_fichas", "SOPÓ_P69_1773089190861", "SOPO_P69_1773089190861", "SOPO"),
    ("historial_fichas", "SOPÓ_P69_1773089538285", "SOPO_P69_1773089538285", "SOPO"),
    ("historial_fichas", "SOPÓ_P69_1773091148271", "SOPO_P69_1773091148271", "SOPO"),
    ("historial_fichas", "SOPÓ_P69_1773971050809", "SOPO_P69_1773971050809", "SOPO"),
    ("historial_fichas", "SOPÓ_P70_1773089607387", "SOPO_P70_1773089607387", "SOPO"),
    ("historial_fichas", "SOPÓ_P70_1773089607441", "SOPO_P70_1773089607441", "SOPO"),
    ("historial_fichas", "SOPÓ_P70_1773969606159", "SOPO_P70_1773969606159", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773089608757", "SOPO_P71_1773089608757", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773106695139", "SOPO_P71_1773106695139", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773190300972", "SOPO_P71_1773190300972", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773231846538", "SOPO_P71_1773231846538", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773232604764", "SOPO_P71_1773232604764", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773234408488", "SOPO_P71_1773234408488", "SOPO"),
    ("historial_fichas", "SOPÓ_P71_1773406038971", "SOPO_P71_1773406038971", "SOPO"),
    ("historial_fichas", "SOPÓ_P936_1772735919873", "SOPO_P936_1772735919873", "SOPO"),
    ("historial_fichas", "SOPÓ_P999_1772749546818", "SOPO_P999_1772749546818", "SOPO"),
    ("historial_fichas", "SOPÓ_P999_1772751427553", "SOPO_P999_1772751427553", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ206_1773332105437", "SOPO_PZ206_1773332105437", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ249_1773936644221", "SOPO_PZ249_1773936644221", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ249_1773936670037", "SOPO_PZ249_1773936670037", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773761499367", "SOPO_PZ36_1773761499367", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773875043967", "SOPO_PZ36_1773875043967", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773875051621", "SOPO_PZ36_1773875051621", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773875314599", "SOPO_PZ36_1773875314599", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773875936587", "SOPO_PZ36_1773875936587", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773881072746", "SOPO_PZ36_1773881072746", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773885562278", "SOPO_PZ36_1773885562278", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ36_1773885827340", "SOPO_PZ36_1773885827340", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ37_1773764622757", "SOPO_PZ37_1773764622757", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ38_1773764187455", "SOPO_PZ38_1773764187455", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ38_1773765822569", "SOPO_PZ38_1773765822569", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ39_1773762361039", "SOPO_PZ39_1773762361039", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ43_1773408085235", "SOPO_PZ43_1773408085235", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ45_1773260781154", "SOPO_PZ45_1773260781154", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ58_1773263349144", "SOPO_PZ58_1773263349144", "SOPO"),
    ("historial_fichas", "SOPÓ_PZ58_1773444353088", "SOPO_PZ58_1773444353088", "SOPO"),

    # === MARCACIONES (SOPÓ Y GRANADA) ===
    ("marcaciones", "SOPÓ_P01", "SOPO_P01", "SOPO"),
    ("marcaciones", "SOPÓ_P02", "SOPO_P02", "SOPO"),
    ("marcaciones", "GRANADA_P01", "GRANADA_P01", "GRANADA"), # Si el ID tiene minúsculas o espacios
    
    # === HISTORIAL MARCACIONES ===
    ("historial_marcaciones", "SOPÓ_P01_1773150000000", "SOPO_P01_1773150000000", "SOPO"),
]

def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    formatted = f"[{timestamp}] {message}"
    print(formatted)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(formatted + "\n")

def run():
    print("--- INICIANDO MIGRACIÓN MAESTRA v2.0 ---")
    path = input("Ruta al JSON de cuenta de servicio: ").strip('"')
    if not os.path.exists(path): return print("Archivo no encontrado.")
    
    firebase_admin.initialize_app(credentials.Certificate(path))
    db = firestore.client()
    stats = {"ok": 0, "err": 0}

    for coll, old_id, new_id, mun in MIGRATION_LIST:
        try:
            old_ref = db.collection(coll).document(old_id)
            doc = old_ref.get()
            if not doc.exists:
                log(f"SKIP | {coll} | {old_id} (No existe en DB)")
                continue

            data = doc.to_dict()
            data['municipio'] = mun
            data['migratedFrom'] = old_id
            data['migratedAt'] = datetime.now().isoformat()

            if DRY_RUN:
                log(f"SIM  | {coll} | {old_id} -> {new_id} (LISTO)")
                stats["ok"] += 1
            else:
                new_ref = db.collection(coll).document(new_id)
                new_ref.set(data)
                if new_ref.get().exists:
                    if old_id != new_id: old_ref.delete()
                    log(f"OK   | {coll} | {old_id} -> {new_id}")
                    stats["ok"] += 1
                else: log(f"ERR  | {coll} | Error al escribir {new_id}")

        except Exception as e:
            log(f"ERR  | {coll} | {old_id} | {str(e)}")
            stats["err"] += 1

    print(f"\nFIN: {stats['ok']} OK, {stats['err']} ERR. Revisa {LOG_FILE}")

if __name__ == "__main__":
    run()
