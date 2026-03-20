import firebase_admin
from firebase_admin import credentials, firestore
import pyproj
import os

# Configuración de Proyección EPSG:9377
CTM12_PROJ = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"

def convert_coords(lat, lon):
    if lat is None or lon is None:
        return None, None
    wgs84 = pyproj.CRS("EPSG:4326")
    ctm12 = pyproj.CRS(CTM12_PROJ)
    transformer = pyproj.Transformer.from_crs(wgs84, ctm12, always_xy=True)
    x, y = transformer.transform(lon, lat)
    return round(x, 2), round(y, 2)

def main():
    service_account_path = 'service-account.json'
    if not os.path.exists(service_account_path):
        print(f"Error: {service_account_path} no encontrado.")
        return

    try:
        cred = credentials.Certificate(service_account_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Error conectando a Firebase: {e}")
        return

    codigos = ["C001", "C002", "C003", "C004"]
    municipio = "RICAURTE"
    
    print(f"{'Código':<8} | {'Latitud':<12} | {'Longitud':<12} | {'Coord X (E)':<12} | {'Coord Y (N)':<12}")
    print("-" * 70)

    for cod in codigos:
        doc_id = f"{municipio}_{cod}"
        doc_ref = db.collection("marcaciones").document(doc_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            gps = data.get('gps', {})
            lat = gps.get('lat')
            lon = gps.get('lng')
            
            x, y = convert_coords(lat, lon)
            
            if x:
                print(f"{cod:<8} | {lat:<12.7f} | {lon:<12.7f} | {x:<12.2f} | {y:<12.2f}")
            else:
                print(f"{cod:<8} | {'Sin GPS':<12} | {'Sin GPS':<12} | {'-':<12} | {'-':<12}")
        else:
            print(f"{cod:<8} | {'No encontrado':<12}")

if __name__ == "__main__":
    main()
