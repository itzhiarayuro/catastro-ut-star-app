import sys

def fix_mojibake(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Manual replacements for common Mojibake
        replacements = [
            # Fix my own previous accidental corruption
            ('Á“', 'Ó'), ('Á³', 'ó'), ('Á¡', 'á'), ('Á©', 'é'), ('Á­', 'í'), ('Áº', 'ú'), ('Á±', 'ñ'),
            ('Á\x8d', 'Í'), ('Áš', 'Ú'), ('Á‘', 'Ñ'),
            
            # Common UTF-8 Mojibake
            ('Ã¡', 'á'), ('Ã©', 'é'), ('Ã\xad', 'í'), ('Ã­', 'í'), ('Ã³', 'ó'), ('Ãº', 'ú'), ('Ã±', 'ñ'),
            ('Ã\x81', 'Á'), ('Ã\x89', 'É'), ('Ã\x8d', 'Í'), ('Ã“', 'Ó'), ('Ãš', 'Ú'), ('Ã\x91', 'Ñ'),
            ('Â¿', '¿'), ('Â¡', '¡'), ('Â·', '·'), ('Ã¼', 'ü'),
            ('Â©', '©'), ('â€¢', '•'), ('Â ', ' '), ('Â', ''),
            
            # Special markers
            ('â•', '═'), ('â•‘', '║'), ('â•—', '╗'), ('â•š', '╚'), ('â•\x9d', '╝'),
            ('âš\xa0ï¸\x8f', '⚠️'), ('âš\xa0', '⚠️'), ('ðŸ“', '📝'), ('âœ\x85', '✅'), ('ðŸš€', '🚀')
        ]
        
        fixed = content
        for bad, good in replacements:
            fixed = fixed.replace(bad, good)
        
        # Specific fixes from previous tool outputs
        fixed = fixed.replace('SOPÁ“', 'SOPÓ')
        fixed = fixed.replace('SesiÃ³n', 'Sesión')
        fixed = fixed.replace('SesiÃ\xb3n', 'Sesión')
        fixed = fixed.replace('CÃ¡mara', 'Cámara')
        fixed = fixed.replace('DirecciÃ³n', 'Dirección')
        fixed = fixed.replace('TuberÃ\xada', 'Tubería')
        fixed = fixed.replace('IdentificaciÃ³n', 'Identificación')
        fixed = fixed.replace('SelecciÃ³n', 'Selección')
        fixed = fixed.replace('mÃ³dulo', 'módulo')
        fixed = fixed.replace('mÃ¡s', 'más')
        fixed = fixed.replace('pÃ©rdida', 'pérdida')
        fixed = fixed.replace('podrÃ¡s', 'podrás')
        fixed = fixed.replace('sobrescribirÃ¡', 'sobrescribirá')
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f"Fixed {file_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    for path in sys.argv[1:]:
        fix_mojibake(path)
