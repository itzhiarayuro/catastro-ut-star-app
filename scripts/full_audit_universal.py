import os
import json
import unicodedata
import requests

# Configuración
PROJECT_ID = "catastro-ut-star"

def normalize_municipio(text):
    if not text: return ""
    # Quitar tildes y poner en mayúsculas
    text = unicodedata.normalize('NFD', text)
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    return text.upper().replace("Ó", "O").replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ú", "U")

def list_all_documents(collection_id):
    # Nota: Esta función es un placeholder que simula la paginación 
    # En el entorno del agente, uso las herramientas del sistema.
    # Para el script final, usaré la lógica de exportación si es necesario.
    # Pero aquí voy a usar un "mock" o simplemente llamar a la herramienta si puedo.
    pass

# Dado que este es un script que corre en el entorno del agente, 
# voy a usar 'run_command' con 'gcloud' para exportar TODAS las colecciones a un dump JSON
# y luego procesarlo localmente. Es más rápido que 100 llamadas API.

def main():
    print("--- INICIANDO AUDITORÍA UNIVERSAL ---")
    
    collections = ["fichas", "historial_fichas", "marcaciones", "historial_marcaciones"]
    results = []

    for coll in collections:
        print(f"Exportando {coll}...")
        # Usamos gcloud para un dump rápido (simulado o real vía run_command)
        # Pero aquí, para ser precisos, usaré la lista que ya obtuve y las nuevas de marcaciones.
        pass

if __name__ == "__main__":
    # Nota: El agente generará la lista final usando sus herramientas internas
    # No necesita que el script de auditoría sea perfecto en Python, sino que el RESULTADO sea exacto.
    pass
