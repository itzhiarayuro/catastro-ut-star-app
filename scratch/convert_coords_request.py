import pyproj

# Definición de EPSG:9377 (MAGNA-SIRGAS / Origen Nacional)
CTM12_PROJ = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"

def convert_coords(lat, lon):
    """Convierte WGS84 a EPSG:9377."""
    wgs84 = pyproj.CRS("EPSG:4326")
    ctm12 = pyproj.CRS(CTM12_PROJ)
    transformer = pyproj.Transformer.from_crs(wgs84, ctm12, always_xy=True)
    x, y = transformer.transform(lon, lat)
    return round(x, 3), round(y, 3)

coords = [
    (4.52952275, -74.23564116),
    (4.529656553, -74.23557046),
    (4.528353724, -74.23705975),
    (4.529708984, -74.23553084),
    (4.528280152, -74.23528557),
    (4.528482114, -74.23669322),
    (4.529483095, -74.23526347),
    (4.529099474, -74.23561822),
    (4.529688716, -74.23553531)
]

print("| LATITUD | LONGITUD | COORDENADA X | COORDENADA Y |")
print("|---|---|---|---|")
for lat, lon in coords:
    x, y = convert_coords(lat, lon)
    print(f"| {lat} | {lon} | {x} | {y} |")
