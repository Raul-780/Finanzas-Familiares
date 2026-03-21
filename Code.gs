function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  
  // Buscar columnas de interés explícitamente (independiente de mayúsculas)
  const colCuenta = findColumnIndex(headers, 'CUENTA');
  const colCategoria = findColumnIndex(headers, 'CATEGORÍA') || findColumnIndex(headers, 'CATEGORIA');
  const colMetodo = findColumnIndex(headers, 'MÉTODO') || findColumnIndex(headers, 'METODO');
  
  const cuentas = colCuenta > 0 ? getUniqueValues(sheet, colCuenta) : ['Gasto Personal', 'Ahorros'];
  const categorias = colCategoria > 0 ? getUniqueValues(sheet, colCategoria) : ['Alimentación', 'Ocio', 'Servicios', 'Otros', 'Hijos'];
  const metodos = colMetodo > 0 ? getUniqueValues(sheet, colMetodo) : ['Tarjeta', 'Efectivo', 'Bizum'];
  
  // Historial: últimos 5 registros
  let history = [];
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const startRow = Math.max(2, lastRow - 4);
    const numRows = lastRow - startRow + 1;
    const data = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
    
    // Asignar nombres estandar en base a la columna
    const cFecha = findColumnIndex(headers, 'FECHA') || 1;
    const cConcepto = findColumnIndex(headers, 'CONCEPTO') || 5; 
    const cImporte = findColumnIndex(headers, 'IMPORTE') || 4;
    
    for (let i = 0; i < data.length; i++) {
        history.push({
           fecha: data[i][cFecha - 1], // Arrays in getValues are 0-indexed
           concepto: data[i][cConcepto - 1] || 'Sin concepto',
           importe: data[i][cImporte - 1] || 0
        });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    cuentas: cuentas,
    categorias: categorias,
    metodos: metodos,
    historial: history.reverse()
  })).setMimeType(ContentService.MimeType.JSON);
}


function getUniqueValues(sheet, colIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  // filter out empties and get unique
  const unique = [...new Set(values.map(r => r[0]).filter(v => v !== "" && v != null))];
  return unique;
}


function findColumnIndex(headers, searchName) {
  // Returns 1-indexed column number, or 0 if not found
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).toUpperCase().trim() === searchName.toUpperCase().trim()) {
      return i + 1;
    }
  }
  return 0;
}


function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const params = e.parameter; // Obtenido vía x-www-form-urlencoded
    
    // Si la hoja está totalmente vacía, creamos unas cabeceras por defecto
    if (headers.length === 0 || headers[0] === "") {
      const defaultHeaders = ['FECHA', 'PAGADOR', 'CUENTA', 'IMPORTE', 'CONCEPTO', 'CATEGORÍA', 'MÉTODO', 'TIPO DE MOVIMIENTO'];
      sheet.appendRow(defaultHeaders);
      
      // Mapeo inicial
      const parseComma = String(params.importe).replace(',', '.'); // Convertimos de vuelta a punto en Backend si es necesario o escribimos en local
      sheet.appendRow([
        params.fecha, 
        params.pagador, 
        params.cuenta, 
        parseFloat(parseComma), 
        params.concepto, 
        params.categoria, 
        params.metodo, 
        params.tipoMovimiento
      ]);
    } else {
      // Mapeamos los campos a las cabeceras existentes
      const rowData = [];
      headers.forEach(header => {
        const h = String(header).toUpperCase().trim();
        let value = "";
        
        if(h === 'FECHA') value = params.fecha;
        else if(h === 'PAGADOR') value = params.pagador;
        else if(h === 'CUENTA') value = params.cuenta;
        else if(h === 'IMPORTE') value = parseFloat(String(params.importe).replace(',', '.')); // Google Sheets prefiere números puros locales
        else if(h === 'CONCEPTO') value = params.concepto;
        else if(h === 'CATEGORÍA' || h === 'CATEGORIA') value = params.categoria;
        else if(h === 'MÉTODO' || h === 'METODO') value = params.metodo;
        else if(h === 'TIPO DE MOVIMIENTO' || h === 'MOVIMIENTO') value = params.tipoMovimiento;
        
        rowData.push(value);
      });
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "Exito"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "Error", "message": error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
