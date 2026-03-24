import os
import csv
import json
import firebase_admin
from firebase_admin import credentials, firestore
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_PATH = r"c:\Users\ICA2025\.gemini\antigravity\scratch\catastro-ut-star-app\service-account.json"
EXPORT_FILE_NAME = "reporte_fotos_faltantes.csv"

def get_drive_service(key_path):
    scopes = ['https://www.googleapis.com/auth/drive.metadata.readonly']
    creds = service_account.Credentials.from_service_account_file(key_path, scopes=scopes)
    return build('drive', 'v3', credentials=creds)

def get_drive_folders(drive_service):
    print("Escaneando Google Drive... esto puede tardar unos segundos.")
    folders_found = set()
    page_token = None
    
    while True:
        query = f"mimeType='application/vnd.google-apps.folder' and trashed=false"
        try:
            response = drive_service.files().list(
                q=query,
                fields='nextPageToken, files(id, name)',
                pageToken=page_token,
                pageSize=1000
            ).execute()
            
            for file in response.get('files', []):
                folders_found.add(file.get('name', '').strip().upper())
                
            page_token = response.get('nextPageToken', None)
            if page_token is None:
                break
        except Exception as e:
            print("Error al consultar Drive:", e)
            break
            
    print(f"[*] Encontradas {len(folders_found)} carpetas en total dentro de Drive.")
    return folders_found

def run():
    KEY_PATH = input("Arrastra aquí o copia la ruta de tu cuenta de servicio JSON de Firebase/Drive: ").strip('"').strip("'")
    
    if not os.path.exists(KEY_PATH):
        print("Archivo JSON de credenciales no encontrado:", KEY_PATH)
        return
        
    print("Inicializando Firebase...")
    firebase_admin.initialize_app(credentials.Certificate(KEY_PATH))
    db = firestore.client()
    
    print("Inicializando Google Drive...")
    drive_service = get_drive_service(KEY_PATH)
    
    # 1. Traer todas las carpetas de Drive
    drive_folders_set = get_drive_folders(drive_service)
    
    # 2. Extraer Pozos de Firebase
    print("Consultando Firebase...")
    pozos_en_firebase = []
    
    fichas_docs = db.collection('fichas').stream()
    for doc in fichas_docs:
        pozos_en_firebase.append({
            "id": doc.id,
            "municipio": doc.to_dict().get('municipio', 'SIN MUNICIPIO'),
            "tipo": "Ficha" # Fichas de Catastro
        })
        
    marcaciones_docs = db.collection('marcaciones').stream()
    for doc in marcaciones_docs:
        doc_data = doc.to_dict()
        codigo = doc_data.get('codigo')
        
        # En caso de que codigo esté vacío, usamos el ID del documento
        if not codigo:
            codigo = doc.id
            
        pozos_en_firebase.append({
            "id": codigo,
            "municipio": doc_data.get('municipio', 'SIN MUNICIPIO'),
            "tipo": "Marcacion" # Marcaciones
        })
        
    print(f"[*] Registros en Firebase procesados: {len(pozos_en_firebase)}")
    
    # 3. Cruzar los datos y escribir el CSV
    fijos_totales = 0
    faltantes = 0
    
    with open(EXPORT_FILE_NAME, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["ID COMPLETO", "NOMBRE CARPETA (DRIVE)", "TIPO", "MUNICIPIO", "TIENE FOTOS EN DRIVE"])
        
        for pozo in pozos_en_firebase:
            pozo_id = pozo['id'].strip().upper()
            
            # Cortamos el MUNICIPIO_ inicial (ej. GRANADA_PPZ258 -> PPZ258)
            if "_" in pozo_id:
                nombre_carpeta = pozo_id.split("_", 1)[1]
            else:
                nombre_carpeta = pozo_id
            
            # Si el nombre de la carpeta (sin el municipio) existe en Drive
            if nombre_carpeta in drive_folders_set:
                tiene_fotos = "SI"
                fijos_totales += 1
            else:
                tiene_fotos = "NO"
                faltantes += 1
                
            # Lo guardamos en el reporte con las dos columnas para estar claros
            writer.writerow([pozo_id, nombre_carpeta, pozo['tipo'], pozo['municipio'], tiene_fotos])
            
    print(f"\n=============================")
    print(f"REPORTE GENERADO CON EXITO")
    print(f"=============================")
    print(f"Se crearon {fijos_totales + faltantes} filas en {EXPORT_FILE_NAME}")
    print(f"-> Con carpeta en Drive: {fijos_totales}")
    print(f"-> SIN carpeta reportada: {faltantes}")

if __name__ == "__main__":
    run()
