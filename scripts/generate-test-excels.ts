import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateExcels() {
  const assetsDir = path.join(__dirname, '../attached_assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Jugadores Singles
  const playersSinglesData = [
    { nombre: 'Juan Pérez', categoria: 'PRO Singles IRT' },
    { nombre: 'Carlos López', categoria: 'Amateur A' },
    { nombre: 'Ricardo Martínez', categoria: 'Senior 45+' },
    { nombre: 'Sofía García', categoria: 'Damas Open' }
  ];
  const wsPlayersSingles = XLSX.utils.json_to_sheet(playersSinglesData);
  const wbPlayersSingles = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPlayersSingles, wsPlayersSingles, 'Jugadores');
  XLSX.writeFile(wbPlayersSingles, path.join(assetsDir, 'prueba_jugadores_singles.xlsx'));

  // 2. Partidos Singles - CORREGIDO: "modalidad" con Mayúscula para coincidir con la validación literal
  const matchesSinglesData = [
    { fecha: '2026-02-10', hora: '09:00', modalidad: 'Singles', jugador1: 'Juan Pérez', jugador2: 'Carlos López' },
    { fecha: '2026-02-10', hora: '10:30', modalidad: 'Singles', jugador1: 'Ricardo Martínez', jugador2: 'Sofía García' }
  ];
  const wsMatchesSingles = XLSX.utils.json_to_sheet(matchesSinglesData);
  const wbMatchesSingles = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbMatchesSingles, wsMatchesSingles, 'Partidos');
  XLSX.writeFile(wbMatchesSingles, path.join(assetsDir, 'prueba_partidos_singles.xlsx'));

  console.log('✅ Archivos Excel generados en attached_assets/');
}

generateExcels();
