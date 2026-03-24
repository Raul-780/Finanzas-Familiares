function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  const colCuenta = findColumnIndex(headers, 'CUENTA');
  const colCategoria = findColumnIndex(headers, 'CATEGORÍA') || findColumnIndex(headers, 'CATEGORIA');
  const colMetodo = findColumnIndex(headers, 'MÉTODO') || findColumnIndex(headers, 'METODO');
  
  let cuentas = colCuenta > 0 ? getUniqueValues(sheet, colCuenta) : [];
  if (cuentas.length === 0) cuentas = ['Gasto Personal', 'Gasto empresarial', 'Ahorros'];
  
  let categorias = colCategoria > 0 ? getUniqueValues(sheet, colCategoria) : [];
  if (categorias.length === 0) categorias = ['Alimentación', 'Ocio', 'Servicios', 'Otros', 'Hijos'];
  // ORDEN ALFABÉTICO REQUERIDO:
  categorias.sort((a,b) => String(a).localeCompare(String(b), 'es', {sensitivity: 'base'}));

  let metodos = colMetodo > 0 ? getUniqueValues(sheet, colMetodo) : [];
  if (metodos.length === 0) metodos = ['Tarjeta', 'Efectivo', 'Bizum'];
  
  let history = [];
  let gastosMensuales = {};
  let ingresosMensuales = {};
  let gastosEmpresariales = {};
  let ingresosEmpresariales = {};
  let totalAhorro = 0;
  const lastRow = Math.max(2, sheet.getLastRow()); 
  
  if (lastRow > 1) {
    let rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    // Mapear el índice original para saber qué fila editar (row = idx + 2)
    let dataMap = rawData.map((row, idx) => ({ rowData: row, rowIndex: idx + 2 }));
    
    // Filtrar vacíos
    dataMap = dataMap.filter(obj => obj.rowData.join('').trim() !== '');
    
    const cFecha = findColumnIndex(headers, 'FECHA');
    const cConcepto = findColumnIndex(headers, 'CONCEPTO'); 
    const cImporte = findColumnIndex(headers, 'IMPORTE');
    const cPagador = findColumnIndex(headers, 'PAGADOR');
    const cCategoria = colCategoria;
    const cMetodo = colMetodo;
    const cCuenta = colCuenta;
    const cTipo = findColumnIndex(headers, 'TIPO DE MOVIMIENTO') || findColumnIndex(headers, 'MOVIMIENTO');
    
    dataMap.sort((a, b) => {
      const dateA = new Date(cFecha > 0 ? a.rowData[cFecha - 1] : 0);
      const dateB = new Date(cFecha > 0 ? b.rowData[cFecha - 1] : 0);
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return timeB - timeA; 
    });
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    dataMap.forEach(obj => {
      let rData = obj.rowData;
      let concepto = cConcepto > 0 ? String(rData[cConcepto - 1]).toLowerCase().trim() : '';
      let tipo = cTipo > 0 ? String(rData[cTipo - 1]).toLowerCase().trim() : '';
      let cat = cCategoria > 0 ? String(rData[cCategoria - 1]) : 'Otros';
      let impRaw = cImporte > 0 ? rData[cImporte - 1] : 0;
      let imp = parseFloat(String(impRaw).replace(',', '.'));
      if (isNaN(imp)) imp = 0;

      // Acumular ahorro de todos los periodos (concepto=ahorro + tipo de movimiento=traspaso)
      if (concepto === 'ahorro' && tipo === 'traspaso') {
        totalAhorro += imp;
      }

      let d = new Date(cFecha > 0 ? rData[cFecha - 1] : 0);
      if (!isNaN(d.getTime()) && (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear) {
         let cuenta = cCuenta > 0 ? String(rData[cCuenta - 1]).toLowerCase().trim() : '';
         let isEmpresarial = (cuenta === 'gasto empresarial' || cuenta === 'empresarial' || cuenta === 'ingreso empresarial');
         
         if (imp < 0) {
            if (isEmpresarial) {
               gastosEmpresariales[cat] = (gastosEmpresariales[cat] || 0) + Math.abs(imp);
            } else {
               gastosMensuales[cat] = (gastosMensuales[cat] || 0) + Math.abs(imp);
            }
         } else if (imp > 0) {
            if (isEmpresarial) {
               ingresosEmpresariales[cat] = (ingresosEmpresariales[cat] || 0) + Math.abs(imp);
            } else {
               ingresosMensuales[cat] = (ingresosMensuales[cat] || 0) + Math.abs(imp);
            }
         }
      }
    });

    const top5Rows = dataMap.slice(0, 5);
    
    for (let i = 0; i < top5Rows.length; i++) {
        let rData = top5Rows[i].rowData;
        history.push({
           rowNumber: top5Rows[i].rowIndex, // CRÍTICO: Saber la fila
           fecha: cFecha > 0 ? rData[cFecha - 1] : '', 
           concepto: cConcepto > 0 ? rData[cConcepto - 1] : '',
           importe: cImporte > 0 ? rData[cImporte - 1] : '',
           pagador: cPagador > 0 ? rData[cPagador - 1] : '',
           categoria: cCategoria > 0 ? rData[cCategoria - 1] : '',
           metodo: cMetodo > 0 ? rData[cMetodo - 1] : '',
           cuenta: cCuenta > 0 ? rData[cCuenta - 1] : '',
           tipoMovimiento: cTipo > 0 ? rData[cTipo - 1] : ''
        });
    }
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let presupuestosArray = [];
  let presupuestoSheet = ss.getSheetByName('Presupuestos');
  if (presupuestoSheet) {
    let pData = presupuestoSheet.getDataRange().getValues();
    if (pData.length > 1) {
      let pH = pData[0];
      let cPAno = findColumnIndex(pH, 'AÑO');
      let cPMes = findColumnIndex(pH, 'MES');
      let cPCat = findColumnIndex(pH, 'CATEGORÍA') || findColumnIndex(pH, 'CATEGORIA');
      let cPPres = findColumnIndex(pH, 'PRESUPUESTO');
      
      const currDate = new Date();
      const currMonth = currDate.getMonth() + 1;
      const currYear = currDate.getFullYear();

      for (let i = 1; i < pData.length; i++) {
        let row = pData[i];
        let pMonthRaw = cPMes > 0 ? row[cPMes - 1] : 0;
        let pMonth = parseInt(pMonthRaw);
        if (isNaN(pMonth)) {
            const mStr = String(pMonthRaw).toLowerCase().trim();
            const mArr = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            pMonth = mArr.indexOf(mStr) + 1;
        }
        let pYear = cPAno > 0 ? parseInt(row[cPAno - 1]) : 0;
        
        if (pMonth === currMonth && pYear === currYear) {
           presupuestosArray.push({
             categoria: cPCat > 0 ? row[cPCat - 1] : '',
             limite: cPPres > 0 ? parseFloat(String(row[cPPres - 1]).replace(',', '.')) : 0
           });
        }
      }
    }
  }

  let objetivosArray = [];
  let objetivosSheet = ss.getSheetByName('Objetivos');
  if (objetivosSheet) {
    let oData = objetivosSheet.getDataRange().getValues();
    if (oData.length > 1) {
      let oH = oData[0];
      let cONom = findColumnIndex(oH, 'NOMBRE');
      if (cONom === 0) cONom = findColumnIndex(oH, 'OBJETIVO');
      let cOMeta = findColumnIndex(oH, 'META');
      if (cOMeta === 0) cOMeta = findColumnIndex(oH, 'IMPORTE OBJETIVO');
      let cOAct = findColumnIndex(oH, 'ACTUAL');
      if (cOAct === 0) cOAct = findColumnIndex(oH, 'AHORRADO');
      let cOFechaLimite = findColumnIndex(oH, 'FECHA LÍMITE');
      if (cOFechaLimite === 0) cOFechaLimite = findColumnIndex(oH, 'FECHA LIMITE');
      
      for (let i = 1; i < oData.length; i++) {
        let row = oData[i];
        let dLim = cOFechaLimite > 0 ? row[cOFechaLimite - 1] : '';
        if (dLim instanceof Date) {
            dLim = dLim.toISOString().split('T')[0];
        }
        objetivosArray.push({
           nombre: cONom > 0 ? row[cONom - 1] : '',
           meta: cOMeta > 0 ? parseFloat(String(row[cOMeta - 1]).replace(',', '.')) : 0,
           actual: cOAct > 0 ? parseFloat(String(row[cOAct - 1]).replace(',', '.')) : 0,
           fechaLimite: dLim
        });
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    cuentas: cuentas,
    categorias: categorias,
    metodos: metodos,
    historial: history,
    gastosMensuales: gastosMensuales,
    ingresosMensuales: ingresosMensuales,
    gastosEmpresariales: gastosEmpresariales,
    ingresosEmpresariales: ingresosEmpresariales,
    presupuestos: presupuestosArray,
    objetivos: objetivosArray,
    totalAhorro: totalAhorro
  })).setMimeType(ContentService.MimeType.JSON);
}

function getUniqueValues(sheet, colIndex) {
  const rule = sheet.getRange(2, colIndex).getDataValidation();
  if (rule) {
    const criteriaType = rule.getCriteriaType();
    if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      return rule.getCriteriaValues()[0];
    } else if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
      const range = rule.getCriteriaValues()[0];
      const vals = range.getValues().map(r => r[0]).filter(v => v !== "" && v != null);
      if (vals.length > 0) return [...new Set(vals)];
    }
  }
  
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
    let lastCol = Math.max(1, sheet.getLastColumn());
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
      
      const action = params.action || 'add';
      const targetRow = params.rowNumber ? parseInt(params.rowNumber) : 0;
      
      if (action === 'edit' && targetRow >= 2) {
         // Sobrescribimos el rango exacto de la fila editada
         sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowData]);
      } else {
         sheet.appendRow(rowData);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "Exito"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "Error", "message": error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
