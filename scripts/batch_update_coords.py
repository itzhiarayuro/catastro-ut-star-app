import firebase_admin
from firebase_admin import credentials, firestore
import pyproj
import argparse
import sys

# Definición de EPSG:9377 (MAGNA-SIRGAS / Origen Nacional)
# PROJ string para pyproj
CTM12_PROJ = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"

def convert_coords(lat, lon):
    """Convierte WGS84 a EPSG:9377."""
    wgs84 = pyproj.CRS("EPSG:4326")
    ctm12 = pyproj.CRS(CTM12_PROJ)
    transformer = pyproj.Transformer.from_crs(wgs84, ctm12, always_xy=True)
    x, y = transformer.transform(lon, lat)
    return round(x, 3), round(y, 3)

def main():
    parser = argparse.ArgumentParser(description='Migración de coordenadas a EPSG:9377.')
    parser.add_argument('--service-account', required=True, help='Ruta al archivo JSON de la cuenta de servicio de Firebase.')
    parser.add_argument('--collection', default='fichas', help='Colección a procesar (fichas o marcaciones).')
    parser.add_argument('--dry-run', action='store_true', help='No realiza cambios, solo muestra lo que se actualizaría.')
    parser.add_argument('--force', action='store_true', help='Procesa registros que ya tienen coordenada_x.')
    
    args = parser.parse_args()

    try:
        cred = credentials.Certificate(args.service_account)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Error al conectar con Firebase: {e}")
        sys.exit(1)

    print(f"--- Iniciando proceso en colección: {args.collection} ---")
    if args.dry_run:
        print("--- MODO SIMULACIÓN (DRY RUN) ---")

    # Si es marcaciones, el nombre es marcaciones. Si es fichas, es fichas.
    # Pero el usuario mencionó que las colecciones pueden tener prefijos o estar agrupadas.
    # En el código JS vemos `fichas/MUNICIPIO_POZO` y `marcaciones/MUNICIPIO_CODIGO`.
    # Esto significa que son COLLECTIONS con documentos, o tal vez subcolecciones.
    # REVISIÓN: useFichaActions.ts usa `fichas/${state.municipio.toUpperCase()}_${state.pozo...}`
    # ESTO ES RARO. Si firestorePath es `fichas/ID`, entonces `fichas` es la colección.
    
    docs = db.collection(args.collection).stream()
    
    count = 0
    updated = 0
    skipped = 0

    for doc in docs:
        count += 1
        data = doc.to_dict()
        
        # Validar si ya tiene coordenadas
        if 'coordenada_x' in data and not args.force:
            skipped += 1
            continue

        # Obtener GPS
        gps = data.get('gps')
        if not gps or not isinstance(gps, dict):
            print(f"[SKIPPED] {doc.id}: No tiene datos GPS válidos.")
            continue
            
        lat = gps.get('lat')
        lon = gps.get('lng') # En Marcaciones es lng, en Fichas parece ser lng también
        
        if lat is None or lon is None:
            print(f"[SKIPPED] {doc.id}: Lat/Lng faltante.")
            continue

        try:
            x, y = convert_coords(lat, lon)
            
            if args.dry_run:
                print(f"[DRY-RUN] {doc.id}: ({lat}, {lon}) -> X: {x}, Y: {y}")
            else:
                doc.reference.update({
                    'coordenada_x': x,
                    'coordenada_y': y
                })
                print(f"[UPDATED] {doc.id}: X: {x}, Y: {y}")
            
            updated += 1
        except Exception as e:
            print(f"[ERROR] {doc.id}: {e}")

    print("\n--- Resumen ---")
    print(f"Total registros leídos: {count}")
    print(f"Total actualizados: {updated}")
    print(f"Total omitidos (ya procesados): {skipped}")
    print(f"Proceso finalizado.")

if __name__ == "__main__":
    main()
