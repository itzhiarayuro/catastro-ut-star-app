const userList = `C01AA
C130
C1525B
C163A
C472A
C542B
CIN1
CIN10
CIN12A
CIN12B
CIN12C
CIN12D
CIN12E
CIN12F
CIN191
CIN19D
CIN19E
CIN19G
CIN19H
CIN19J
CIN2
CIN21A
CIN26
CIN27
CIN28
CIN28A
CIN28B
CIN28B1
CIN28C
CIN29
CIN3
CIN30
CIN31A
CIN33A
CIN34
CIN34C
CIN35
CIN35A
CIN36
CIN37
CIN39
CIN4
CIN40
CIN42
CIN43
CIN5
CIN6
CIN7
CIN8
CIN9
CS20
M074
M108
M1814
M336
M337
M654
M676
M678
M894
M895
M896
M903
M905
MH164`.split(/\s+/).map(s => s.trim()).filter(s => s);

const xyTableIds = `C130, CIN36, CIN1, CIN10, CIN191, C163A, CIN19D, CIN19E, CIN19H, CIN19J, CIN2, CIN27, CIN28, CIN28C, CIN28A, CIN28B1, CIN29, CIN3, CIN30, CIN31A, CIN33A, CIN34, CIN34C, CIN35A, CIN37, CIN39, CIN35, CIN4, CIN5, CIN6, CIN7, CIN8, CIN9, CIN28B, CIN12E, CIN12D, CIN12C, CIN12A, CIN12F, CIN19G, MIN12B, MH164, M654, M678, M896, M903, M905, CIN15, CIN46, CIN45, CIN44, CIN43, M337, CIN42, CIN40, CIN19B, C472A, C542B, CIN26, CIN21A, CO1AA, CS20, M074, M676, M1814`.split(/,\s+/).map(s => s.trim()).filter(s => s);

// Normalize for comparison (CO1AA -> C01AA)
const normalize = (id) => id === 'CO1AA' ? 'C01AA' : id;

const normXYIds = xyTableIds.map(normalize);
const normUserList = userList.map(normalize);

const missingCoords = normUserList.filter(id => !normXYIds.includes(id));
const notFoundInFirestore = ['CIN15', 'CIN46', 'CIN45', 'CIN44', 'CIN19B', 'MIN12B']; // from previous run output

console.log('--- RESUMEN DE COMPARACIÓN ---');
console.log('Pozos que NO estaban en la tabla X,Y (por lo tanto no se pudieron convertir/actualizar):');
console.log(missingCoords.join(', '));

console.log('\nPozos que SI estaban en la tabla X,Y pero NO se encontraron en la colección "fichas":');
console.log(notFoundInFirestore.join(', '));
