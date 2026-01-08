import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

async function fixExcel() {
    const filePath = 'attached_assets/Partidos_singles_demo_2_1767836531804.xlsx';
    
    if (!fs.existsSync(filePath)) {
        console.error('El archivo no existe:', filePath);
        process.exit(1);
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        console.log('Filas encontradas:', data.length);

        const fixedData = data.map(row => {
            const newRow: any = {};
            const normalizedRow: any = {};
            for (const key in row) {
                normalizedRow[key.toLowerCase().trim()] = row[key];
            }

            // Mapeo exacto basado en lo que espera excelMatchSinglesSchema
            newRow.fecha = normalizedRow.fecha || '';
            newRow.hora = normalizedRow.hora || '';
            newRow.modalidad = 'Singles';
            newRow.jugador1 = normalizedRow.jugador1 || '';
            newRow.jugador2 = normalizedRow.jugador2 || '';

            return newRow;
        });

        const newWs = XLSX.utils.json_to_sheet(fixedData);
        const newWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWb, newWs, 'Partidos');
        
        const outputName = 'attached_assets/Partidos_singles_funcional.xlsx';
        XLSX.writeFile(newWb, outputName);
        console.log('✅ Archivo corregido creado:', outputName);
    } catch (error) {
        console.error('Error procesando el archivo:', error);
        process.exit(1);
    }
}

fixExcel();
