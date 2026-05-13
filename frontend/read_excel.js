import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath = path.resolve('../docs/Data Engineering and AI - Actual Program (1).xlsx');
console.log('Reading file:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Read as array of arrays

    console.log(`Total rows: ${data.length}`);
    const slice = data.slice(0, 10);
    slice.forEach((row, i) => {
      console.log(`Row ${i}:`, JSON.stringify(row.slice(0, 15))); // Log first 15 columns
    });
  });
} catch (error) {
  console.error('Error reading file:', error);
}
