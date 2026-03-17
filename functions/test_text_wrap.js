const { jsPDF } = require("jspdf");
const fs = require('fs');

const doc = new jsPDF();
doc.setFontSize(10);
const textStr = "EMPRESA DE SERVICIOS PÚBLICOS DE SAN JOSÉ DE LA MARINILLA E.S.P.\nCONTRATO DE CONSULTORÍA 120-2025.\nINGENIERÍA CIVIL & AMBIENTAL – INGENIEROS CONSULTORES S.A.S.\n\"REALIZAR PLAN MAESTRO DE ACUEDUCTO Y ALCANTARILLADO EN EL ÁREA DE PRESTACION DE LOS SERVICIOS ACTUALES Y DE EXPANSIÓN URBANA INCLUYENDO ESTUDIOS A DETALLE DE UNA NUEVA PLANTA DE TRATAMIENTO DE AGUAS RESIDUALES Y EL COLECTOR POR PARTE DE LA EMPRESA DE SERVICIOS PUBLICOS SAN JOSE DE LA MARINILLA EN EL MUNICIPIO DE MARINILLA ANTIOQUIA\"";

const x = 20;
const y = 20;
const width = 170;
const height = 40;

doc.rect(x, y, width, height); // draw box to see

const availableWidth = width - 4;
const textLines = doc.splitTextToSize(textStr, availableWidth);
console.log("lines count:", textLines.length);

const pt_to_mm = 0.352778; // precise conversion
// height of a line including default spacing is doc.getLineHeight() * pt_to_mm
// Or jsPDF's factor is usually 1.15
const lineHeight = doc.getLineHeight() * pt_to_mm * doc.getLineHeightFactor();
console.log("lineHeight:", lineHeight);

// If baseline is middle, y coordinate represents the center of the FIRST line.
const totalTextHeight = (textLines.length - 1) * lineHeight;
const startY = y + (height / 2) - (totalTextHeight / 2);

console.log("Y:", y, "Height:", height, "Mid box:", y + height / 2);
console.log("Total text height:", totalTextHeight);
console.log("startY:", startY);

doc.text(textLines, x + width / 2, startY, {
    align: "center",
    baseline: "middle"
});

fs.writeFileSync("test.pdf", Buffer.from(doc.output('arraybuffer')));
console.log("Written test.pdf");
