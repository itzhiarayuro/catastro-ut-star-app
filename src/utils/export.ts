import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (ficha: any) => {
    const doc = new jsPDF() as any;
    const title = `FICHA TÉCNICA CATASTRO - POZO ${ficha.pozo || 'S/N'}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.text(`Municipio: ${ficha.municipio}`, 14, 30);
    doc.text(`Fecha: ${ficha.fecha}`, 14, 35);
    doc.text(`Sistema: ${ficha.sistema}`, 14, 40);
    doc.text(`Dirección: ${ficha.direccion}`, 14, 45);

    const generalInfo = [
        ['Campo', 'Valor'],
        ['Rasante', ficha.rasante],
        ['Estado Pozo', ficha.estadoPozo],
        ['Diámetro', `${ficha.diam} m`],
        ['Altura', `${ficha.altura} m`],
        ['GPS Lat', ficha.gps?.lat || '-'],
        ['GPS Lng', ficha.gps?.lng || '-'],
    ];

    doc.autoTable({
        startY: 50,
        head: [generalInfo[0]],
        body: generalInfo.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [0, 132, 255] }
    });

    if (ficha.pipes && ficha.pipes.length > 0) {
        const pipeData = ficha.pipes.map((p: any, i: number) => [
            p.label || `P${i + 1}`,
            p.es,
            p.deA,
            p.diam,
            p.mat,
            p.z
        ]);
        doc.autoTable({
            startY: doc.lastAutoTable.cursor.y + 10,
            head: [['ID', 'Tipo', 'De/A', 'Ø', 'Material', 'Cota Z']],
            body: pipeData,
            theme: 'striped',
            headStyles: { fillColor: [0, 200, 150] }
        });
    }

    doc.save(`Ficha_${ficha.municipio}_${ficha.pozo}.pdf`);
};

export const exportToExcel = (fichas: any[]) => {
    const data = fichas.map(f => ({
        Pozo: f.pozo,
        Municipio: f.municipio,
        Fecha: f.fecha,
        Sistema: f.sistema,
        Estado: f.estadoPozo,
        Latitud: f.gps?.lat,
        Longitud: f.gps?.lng,
        Diametro: f.diam,
        Altura: f.altura,
        Tapa_Mat: f.tapa?.mat,
        Cargue_Mat: f.cargue?.mat,
        Cuerpo_Mat: f.cuerpo?.mat,
        Tuberias: f.pipes?.length || 0,
        Fotos: (f.photos?.general?.length || 0) + (f.photos?.interior?.length || 0) + (f.photos?.danos?.length || 0)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catastro");
    XLSX.writeFile(wb, `Reporte_Catastro_${new Date().toISOString().split('T')[0]}.xlsx`);
};
