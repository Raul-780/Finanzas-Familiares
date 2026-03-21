function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  const colCuenta = findColumnIndex(headers, 'CUENTA');
  const colCategoria = findColumnIndex(headers, 'CATEGORÍA') || findColumnIndex(headers, 'CATEGORIA');
  const colMetodo = findColumnIndex(headers, 'MÉTODO') || findColumnIndex(headers, 'METODO');
  
  // Obtener opciones dinámicas leyendo los desplegables configurados
  let cuentas = colCuenta > 0 ? getUniqueValues(sheet, colCuenta) : [];
  if (cuentas.length === 0) cuentas = ['Gasto Personal', 'Gasto empresarial', 'Ahorros'];
  
  let categorias = colCategoria > 0 ? getUniqueValues(sheet, colCategoria) : [];
  if (categorias.length === 0) categorias = ['Alimentación', 'Ocio', 'Servicios', 'Otros', 'Hijos'];

  let metodos = colMetodo > 0 ? getUniqueValues(sheet, colMetodo) : [];
  if (metodos.length === 0) metodos = ['Tarjeta', 'Efectivo', 'Bizum'];
  
  // Historial: Buscamos y ordenamos por FECHA en lugar de coger simplemente los de abajo
  let history = [];
  const lastRow = Math.max(2, sheet.getLastRow()); // Al menos la fila 2
  
  if (lastRow > 1) {
    let data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    // Filtrar filas completamente vacías
    data = data.filter(row => row.join('').trim() !== '');
    
    // Asignar columnas correctas dinámicamente
    const cFecha = findColumnIndex(headers, 'FECHA') || 1;
    const cConcepto = findColumnIndex(headers, 'CONCEPTO') || 5; 
    const cImporte = findColumnIndex(headers, 'IMPORTE') || 4;
    
    // Ordenar el array entero de más reciente a más antiguo leyendo la fecha
    data.sort((a, b) => {
      const dateA = new Date(a[cFecha - 1]);
      const dateB = new Date(b[cFecha - 1]);
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return timeB - timeA; // Queremos descendente: la mayor/última fecha (timeB) antes
    });
    
    // Tomar solo el "Top 5" más recientes
    const top5Rows = data.slice(0, 5);
    
    for (let i = 0; i < top5Rows.length; i++) {
        history.push({
           fecha: top5Rows[i][cFecha - 1], 
           concepto: top5Rows[i][cConcepto - 1] || 'Sin concepto',
           importe: top5Rows[i][cImporte - 1] || 0
        });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    cuentas: cuentas,
    categorias: categorias,
    metodos: metodos,
    historial: history // Ya está ordenado, no hace falta hacer reverse()
  })).setMimeType(ContentService.MimeType.JSON);
}

// NUEVA POTENCIA: Leer las reglas de "menú desplegable" fijadas en la fila 2 de esa columna
function getUniqueValues(sheet, colIndex) {
  // Primero intentamos extraer las opciones del "menú desplegable" de Validación de datos
  const rule = sheet.getRange(2, colIndex).getDataValidation();
  if (rule) {
    const criteriaType = rule.getCriteriaType();
    // Si la validación es una lista escrita manualmente (Ej: "Opción A, Opción B"):
    if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      return rule.getCriteriaValues()[0];
    } 
    // Si la validación lee de un rango definido (Ej: "=Configuración!A:A"):
    else if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
      const range = rule.getCriteriaValues()[0];
      const vals = range.getValues().map(r => r[0]).filter(v => v !== "" && v != null);
      if (vals.length > 0) return [...new Set(vals)];
    }
  }
  
  // Si no detecta regla de Validación de Datos, leemos las palabras únicas escritas en toda la columna
  const lastRow = Math.max(2, sheet.getLastRow());
  const values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  const unique = [...new Set(values.map(r => r[0]).filter(v => v !== "" && v != null))];
  return unique;
}

function findColumnIndex(headers, searchName) {
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
    const lastCol = Math.max(1, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const params = e.parameter; 
    
    if (headers.length === 0 || headers[0] === "") {
      const defaultHeaders = ['FECHA', 'PAGADOR', 'CUENTA', 'IMPORTE', 'CONCEPTO', 'CATEGORÍA', 'MÉTODO', 'TIPO DE MOVIMIENTO'];
      sheet.appendRow(defaultHeaders);
      
      const parseComma = String(params.importe).replace(',', '.'); 
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
      const rowData = [];
      headers.forEach(header => {
        const h = String(header).toUpperCase().trim();
        let value = "";
        
        if(h === 'FECHA') value = params.fecha;
        else if(h === 'PAGADOR') value = params.pagador;
        else if(h === 'CUENTA') value = params.cuenta;
        else if(h === 'IMPORTE') value = parseFloat(String(params.importe).replace(',', '.')); 
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
