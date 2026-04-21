#!/usr/bin/env python3
"""
Google Drive Duplicate Photo Cleaner - Versión Simplificada
Elimina estrictamente duplicados por nombre exacto y peso igual.
"""

import os
import sys
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum

# Google API imports
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.exceptions import RefreshError
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configuración
FOLDER_ID = "1JJFOP_OQot-n4sqfDORtJYuLQiNyoDZx"  # Cambia por tu ID de carpeta
SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
]

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'drive_cleaner_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class FileInfo:
    """Información básica de un archivo"""
    id: str
    name: str
    size: int
    md5Checksum: str
    createdTime: datetime
    path: str = ""

class DuplicateCleaner:
    """Limpiador de duplicados simple y directo"""
    
    def __init__(self):
        self.drive_service = None
        self.setup_authentication()
    
    def setup_authentication(self):
        """Configura autenticación con Google Drive"""
        creds = None
        
        # Buscar token existente
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
        # Si no hay credenciales válidas, autenticar
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except RefreshError:
                    if os.path.exists('token.json'):
                        os.remove('token.json')
                    creds = None
            
            if not creds:
                # Intentar service account primero
                if os.path.exists('service-account.json'):
                    try:
                        creds = service_account.Credentials.from_service_account_file(
                            'service-account.json', scopes=SCOPES
                        )
                        print("✅ Usando credenciales de service account")
                    except Exception as e:
                        print(f"⚠️ Error con service account: {e}")
                        creds = None
                
                # Si no hay service account, usar OAuth2
                if not creds:
                    if not os.path.exists('credentials.json'):
                        print("❌ ERROR: No se encontró credentials.json")
                        print("   Descarga las credenciales desde Google Cloud Console")
                        sys.exit(1)
                    
                    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Guardar token para próxima vez (solo OAuth2)
                if hasattr(creds, 'to_json'):
                    with open('token.json', 'w') as token:
                        token.write(creds.to_json())
        
        self.drive_service = build('drive', 'v3', credentials=creds)
        print("✅ Autenticación exitosa con Google Drive")
    
    def get_all_files_in_folder(self, folder_id: str) -> List[FileInfo]:
        """Obtiene todos los archivos de una carpeta recursivamente"""
        print(f"📁 Escaneando carpeta: {folder_id}")
        all_files = []
        folders_to_scan = [(folder_id, "")]
        
        while folders_to_scan:
            current_folder, current_path = folders_to_scan.pop(0)
            page_token = None
            
            while True:
                try:
                    # Obtener archivos de la carpeta actual
                    query = f"'{current_folder}' in parents and trashed=false"
                    
                    results = self.drive_service.files().list(
                        q=query,
                        pageSize=1000,
                        fields="nextPageToken, files(id,name,size,mimeType,parents,md5Checksum,createdTime)",
                        pageToken=page_token
                    ).execute()
                    
                    items = results.get('files', [])
                    
                    for item in items:
                        file_name = item.get('name', '')
                        file_size = int(item.get('size', 0)) if item.get('size') else 0
                        mime_type = item.get('mimeType', '')
                        file_id = item.get('id', '')
                        
                        # Construir ruta completa
                        full_path = f"{current_path}/{file_name}" if current_path else f"/{file_name}"
                        
                        # Si es carpeta, agregarla para escaneo recursivo
                        if mime_type == 'application/vnd.google-apps.folder':
                            folders_to_scan.append((file_id, full_path))
                        else:
                            # Solo procesar archivos con tamaño y checksum (no Google Docs, etc.)
                            file_md5 = item.get('md5Checksum', '')
                            file_created = item.get('createdTime', '')
                            
                            if file_size > 0 and file_md5:
                                dt_created = datetime.fromisoformat(file_created.replace('Z', '+00:00')) if file_created else datetime.now()
                                file_info = FileInfo(
                                    id=file_id,
                                    name=file_name,
                                    size=file_size,
                                    md5Checksum=file_md5,
                                    createdTime=dt_created,
                                    path=full_path
                                )
                                all_files.append(file_info)
                    
                    # Verificar si hay más páginas
                    page_token = results.get('nextPageToken')
                    if not page_token:
                        break
                        
                    # Mostrar progreso
                    if len(all_files) % 100 == 0:
                        print(f"   📊 Procesados {len(all_files)} archivos...")
                
                except HttpError as e:
                    print(f"⚠️ Error accediendo a carpeta {current_folder}: {e}")
                    break
                except Exception as e:
                    print(f"⚠️ Error inesperado: {e}")
                    break
        
        print(f"✅ Escaneo completado: {len(all_files)} archivos encontrados")
        return all_files
    
    def find_exact_duplicates(self, files: List[FileInfo]) -> Dict[str, List[FileInfo]]:
        """Encuentra duplicados EXACTOS por nombre y checksum MD5"""
        print("🔍 Buscando duplicados exactos (mismo nombre + mismo MD5)...")
        
        # Agrupar por (nombre, md5Checksum)
        groups = {}
        for file in files:
            key = (file.name, file.md5Checksum)
            if key not in groups:
                groups[key] = []
            groups[key].append(file)
        
        # Filtrar solo grupos con 2+ archivos (duplicados) y ordenar por fecha
        duplicates = {}
        for key, file_list in groups.items():
            if len(file_list) >= 2:
                # Ordenar la lista para que el MÁS ANTIGUO (original) quede primero
                file_list.sort(key=lambda x: x.createdTime)
                
                name, md5 = key
                size = file_list[0].size  # El tamaño es el mismo en todos
                group_name = f"{name} ({size} bytes, MD5: {md5[:8]}...)"
                duplicates[group_name] = file_list
        
        print(f"✅ Encontrados {len(duplicates)} grupos de duplicados")
        return duplicates
    
    def show_duplicates_preview(self, duplicate_groups: Dict[str, List[FileInfo]]):
        """Muestra vista previa de duplicados encontrados"""
        print("\n" + "="*60)
        print("VISTA PREVIA DE DUPLICADOS ENCONTRADOS")
        print("="*60)
        
        total_duplicates = 0
        total_space_wasted = 0
        
        for group_name, files in duplicate_groups.items():
            print(f"\n📁 Grupo: {group_name}")
            print(f"   Total de archivos: {len(files)}")
            
            # El primero es el original, el resto son duplicados
            original = files[0]
            duplicates = files[1:]
            
            print(f"   🟢 ORIGINAL (se conserva): {original.path}")
            
            for i, dup in enumerate(duplicates, 1):
                print(f"   🔴 DUPLICADO {i} (se eliminará): {dup.path}")
                total_duplicates += 1
                total_space_wasted += dup.size
        
        print(f"\n📊 RESUMEN:")
        print(f"   Archivos duplicados a eliminar: {total_duplicates}")
        print(f"   Espacio a liberar: {self.format_size(total_space_wasted)}")
        print("="*60)
    
    def delete_duplicates(self, duplicate_groups: Dict[str, List[FileInfo]], confirm: bool = False) -> Dict[str, Any]:
        """Elimina los duplicados (conserva el primero de cada grupo)"""
        if not confirm:
            print("⚠️ MODO VISTA PREVIA - No se eliminarán archivos")
            self.show_duplicates_preview(duplicate_groups)
            return {"deleted": 0, "errors": 0, "space_freed": 0}
        
        print("\n🗑️ INICIANDO ELIMINACIÓN DE DUPLICADOS...")
        print("⚠️ ELIMINANDO ARCHIVOS REALES - NO SE PUEDE DESHACER")
        
        deleted_count = 0
        error_count = 0
        space_freed = 0
        errors = []
        
        for group_name, files in duplicate_groups.items():
            print(f"\n📁 Procesando grupo: {group_name}")
            
            # El primero es el original (NO se elimina)
            original = files[0]
            duplicates = files[1:]  # Estos SÍ se eliminan
            
            print(f"   🟢 CONSERVANDO original: {original.path}")
            
            # Eliminar cada duplicado
            for i, duplicate in enumerate(duplicates, 1):
                try:
                    print(f"   🗑️ Eliminando duplicado {i}: {duplicate.path}")
                    
                    # ELIMINAR ARCHIVO (mover a papelera)
                    self.drive_service.files().update(
                        fileId=duplicate.id,
                        body={'trashed': True}
                    ).execute()
                    
                    deleted_count += 1
                    space_freed += duplicate.size
                    print(f"      ✅ Eliminado exitosamente")
                    
                    # Pausa pequeña para no saturar la API
                    time.sleep(0.1)
                    
                except HttpError as e:
                    error_msg = f"Error eliminando {duplicate.path}: {e}"
                    print(f"      ❌ {error_msg}")
                    errors.append(error_msg)
                    error_count += 1
                except Exception as e:
                    error_msg = f"Error inesperado eliminando {duplicate.path}: {e}"
                    print(f"      ❌ {error_msg}")
                    errors.append(error_msg)
                    error_count += 1
        
        # Resumen final
        print(f"\n" + "="*60)
        print("RESUMEN DE ELIMINACIÓN")
        print("="*60)
        print(f"✅ Archivos eliminados: {deleted_count}")
        print(f"❌ Errores: {error_count}")
        print(f"💾 Espacio liberado: {self.format_size(space_freed)}")
        
        if errors:
            print(f"\n⚠️ ERRORES ENCONTRADOS:")
            for error in errors[:5]:  # Mostrar solo los primeros 5
                print(f"   • {error}")
            if len(errors) > 5:
                print(f"   ... y {len(errors) - 5} errores más")
        
        print("="*60)
        
        return {
            "deleted": deleted_count,
            "errors": error_count,
            "space_freed": space_freed,
            "error_list": errors
        }
    
    def format_size(self, size_bytes: int) -> str:
        """Formatea tamaño en bytes a formato legible"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        
        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f"{size:.1f} {size_names[i]}"
    
    def run(self):
        """Ejecuta el proceso completo de limpieza"""
        print("🚀 GOOGLE DRIVE DUPLICATE CLEANER")
        print("="*50)
        print(f"📁 Carpeta objetivo: {FOLDER_ID}")
        print("🎯 Criterio: Nombre exacto + Hash MD5 exacto")
        print("🎯 Conservación: Siempre el archivo más antiguo")
        print("="*50)
        
        try:
            # 1. Escanear archivos
            all_files = self.get_all_files_in_folder(FOLDER_ID)
            
            if not all_files:
                print("⚠️ No se encontraron archivos en la carpeta")
                return
            
            # 2. Encontrar duplicados exactos
            duplicate_groups = self.find_exact_duplicates(all_files)
            
            if not duplicate_groups:
                print("✅ ¡No se encontraron duplicados! Tu Drive está limpio.")
                return
            
            # 3. Mostrar vista previa
            self.show_duplicates_preview(duplicate_groups)
            
            # 4. Preguntar al usuario qué hacer
            print("\n" + "="*50)
            print("¿QUÉ DESEAS HACER?")
            print("1) Solo ver (no eliminar nada)")
            print("2) ELIMINAR duplicados (IRREVERSIBLE)")
            print("="*50)
            
            while True:
                try:
                    choice = input("Selecciona opción (1 o 2): ").strip()
                    
                    if choice == "1":
                        print("✅ Modo vista previa seleccionado - No se eliminará nada")
                        self.delete_duplicates(duplicate_groups, confirm=False)
                        break
                    
                    elif choice == "2":
                        print("\n⚠️ ADVERTENCIA: Vas a ELIMINAR archivos realmente")
                        print("   Los archivos se moverán a la papelera de Google Drive")
                        print("   Se conservará el primer archivo de cada grupo")
                        
                        confirm = input("\n¿Estás SEGURO? Escribe 'ELIMINAR' para confirmar: ").strip()
                        
                        if confirm.upper() == "ELIMINAR":
                            print("✅ Confirmado - Iniciando eliminación...")
                            result = self.delete_duplicates(duplicate_groups, confirm=True)
                            
                            # Guardar log de resultados
                            log_file = f"eliminacion_duplicados_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                            with open(log_file, 'w', encoding='utf-8') as f:
                                f.write(f"ELIMINACIÓN DE DUPLICADOS - {datetime.now()}\n")
                                f.write("="*50 + "\n")
                                f.write(f"Archivos eliminados: {result['deleted']}\n")
                                f.write(f"Errores: {result['errors']}\n")
                                f.write(f"Espacio liberado: {self.format_size(result['space_freed'])}\n\n")
                                
                                if result['error_list']:
                                    f.write("ERRORES:\n")
                                    for error in result['error_list']:
                                        f.write(f"- {error}\n")
                            
                            print(f"📄 Log guardado en: {log_file}")
                            break
                        else:
                            print("❌ Eliminación cancelada")
                            break
                    
                    else:
                        print("❌ Opción inválida. Ingresa 1 o 2")
                
                except KeyboardInterrupt:
                    print("\n❌ Operación cancelada por el usuario")
                    break
                except Exception as e:
                    print(f"❌ Error: {e}")
                    break
        
        except Exception as e:
            logger.error(f"Error crítico: {e}")
            print(f"❌ Error crítico: {e}")
            sys.exit(1)

def main():
    """Función principal"""
    # Validar configuración
    if not FOLDER_ID or FOLDER_ID.strip() == "":
        print("❌ ERROR: FOLDER_ID no está configurado")
        print("   Edita la línea FOLDER_ID en el script con tu ID de carpeta")
        sys.exit(1)
    
    # Ejecutar limpiador
    cleaner = DuplicateCleaner()
    cleaner.run()

if __name__ == "__main__":
    main()