const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZM2snpELQJKyjQIyjM4DmOTk4jCKcQEv9NKbGa-bA7rzbeIo6CmDQOmoFKjBoLvM/exec';

// DOM Elements
const form = document.getElementById('finance-form');
const identities = document.querySelectorAll('.identity-btn');
const idError = document.getElementById('identity-error');
const cuentaSelect = document.getElementById('cuenta');
const categoriaSelect = document.getElementById('categoria');
const metodoSelect = document.getElementById('metodo');
const conceptoInput = document.getElementById('concepto');
const tipoMovimientoSelect = document.getElementById('tipoMovimiento');
const fechaInput = document.getElementById('fecha');
const importeInput = document.getElementById('importe');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const btnText = btnSubmit.querySelector('.btn-text');
const loader = btnSubmit.querySelector('.loader');
const historyList = document.getElementById('history-list');

// App State
let selectedIdentity = null;
let editingRowNumber = null;
let fullHistoryArray = [];
let appDataGlobal = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fechaInput.valueAsDate = new Date();
    fetchAppData();
});



// Identities Selection
identities.forEach(btn => {
    btn.addEventListener('click', () => {
        setIdentityCheck(btn.dataset.id);
    });
});

function setIdentityCheck(idName) {
    identities.forEach(b => b.classList.remove('selected'));
    const btn = Array.from(identities).find(b => b.dataset.id === idName);
    if(btn) btn.classList.add('selected');
    selectedIdentity = idName;
    idError.textContent = ''; 
    
    // Auto-select Niños logics
    if (selectedIdentity === 'Niños') {
        const opts = Array.from(categoriaSelect.options).map(o => o.value);
        if (opts.includes('Hijos')) categoriaSelect.value = 'Hijos';
        else if (opts.includes('Otros')) categoriaSelect.value = 'Otros';
    }
}

// Concept automatic selection
conceptoInput.addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase();
    if (text.includes('cajero') || text.includes('sacar')) {
        tipoMovimientoSelect.value = 'Traspaso';
    } else if (tipoMovimientoSelect.value === 'Traspaso' && !(text.includes('cajero') || text.includes('sacar'))) {
        tipoMovimientoSelect.value = 'Flujo Real';
    }
});

// Fetch Init Data
async function fetchAppData() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        populateSelect(cuentaSelect, data.cuentas, 'Gasto Personal');
        populateSelect(categoriaSelect, data.categorias, '');
        populateSelect(metodoSelect, data.metodos, '');
        
        fullHistoryArray = data.historial;
        appDataGlobal = data;
        renderHistory();
        if(typeof renderDashboard === 'function') renderDashboard();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error al conectar con Google Sheets. Comprueba tu URL.');
    }
}

function populateSelect(selectEl, optionsArray, defaultValue) {
    if (!optionsArray || optionsArray.length === 0) return;
    // Don't overwrite if we are editing! unless it's initial load
    const currentVal = selectEl.value; 
    selectEl.innerHTML = '';
    optionsArray.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        selectEl.appendChild(option);
    });
    // Recovery existing value if exists in new options, else default
    if (currentVal && optionsArray.includes(currentVal)) {
        selectEl.value = currentVal;
    } else if (defaultValue && optionsArray.includes(defaultValue)) {
        selectEl.value = defaultValue;
    }
}

function renderHistory() {
    if (!fullHistoryArray || fullHistoryArray.length === 0) {
        historyList.innerHTML = '<div class="history-placeholder">Sin registros recientes.</div>';
        return;
    }
    historyList.innerHTML = '';
    fullHistoryArray.forEach(item => {
        const importeFloat = parseFloat(String(item.importe).replace(',', '.'));
        const isExpense = importeFloat < 0;
        const formattedAmount = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(importeFloat);
        
        // Formatear la fecha original (evitar desajustes horarios)
        const dateObj = item.fecha ? new Date(item.fecha) : null;
        const dateStr = dateObj ? dateObj.toLocaleDateString('es-ES') : '';

        const div = document.createElement('div');
        div.className = `history-item ${isExpense ? 'expense' : 'income'}`;
        div.innerHTML = `
            <div class="history-row-main">
                <div class="history-info">
                    <span class="history-date">${dateStr}</span>
                    <span class="history-concepto">${item.concepto}</span>
                </div>
                <div class="history-info-wrapper">
                    <span class="history-amount ${isExpense ? 'expense' : 'income'}">${formattedAmount}</span>
                    <button class="history-edit-btn" title="Editar" data-row="${item.rowNumber}">✏️</button>
                </div>
            </div>
        `;
        historyList.appendChild(div);
    });

    // Add listener to edit buttons
    document.querySelectorAll('.history-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rowNumber = parseInt(e.currentTarget.dataset.row);
            enterEditMode(rowNumber);
        });
    });
}

// Edit Mode Logic
function enterEditMode(rowNumber) {
    const item = fullHistoryArray.find(h => h.rowNumber === rowNumber);
    if (!item) return;

    editingRowNumber = rowNumber;
    
    // Rellenar fecha
    if (item.fecha) {
        // Para <input type="date"> se necesita el formato YYYY-MM-DD
        const d = new Date(item.fecha);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        fechaInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Rellenar los dropdowns si existen
    if(item.cuenta) cuentaSelect.value = item.cuenta;
    if(item.categoria) categoriaSelect.value = item.categoria;
    if(item.metodo) metodoSelect.value = item.metodo;
    if(item.tipoMovimiento) tipoMovimientoSelect.value = item.tipoMovimiento;
    
    // Rellenar textos
    conceptoInput.value = item.concepto;
    
    // Determinar Gasto/Ingreso e importe
    const importeFloat = parseFloat(String(item.importe).replace(',', '.'));
    importeInput.value = Math.abs(importeFloat).toFixed(2);
    
    const isExpense = importeFloat < 0;
    const radioGasto = document.querySelector('input[name="nature"][value="gasto"]');
    const radioIngreso = document.querySelector('input[name="nature"][value="ingreso"]');
    if (isExpense) radioGasto.checked = true;
    else radioIngreso.checked = true;

    // Rellenar Pagador
    if (item.pagador) setIdentityCheck(item.pagador);

    // Cambiar Aspecto Botones
    btnText.textContent = 'ACTUALIZAR REGISTRO';
    btnSubmit.style.backgroundColor = '#f59e0b'; // Amber for edit
    btnCancel.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnCancel.addEventListener('click', resetFormMode);

function resetFormMode() {
    editingRowNumber = null;
    form.reset();
    identities.forEach(b => b.classList.remove('selected'));
    selectedIdentity = null;
    fechaInput.valueAsDate = new Date();
    
    btnText.textContent = 'GUARDAR REGISTRO';
    btnSubmit.style.backgroundColor = ''; // vuelve a CSS original
    btnCancel.classList.add('hidden');
    idError.textContent = '';
}

// Submitting Form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedIdentity) {
        idError.textContent = '✗ Debes seleccionar quién paga.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    if (!SCRIPT_URL) {
        alert('Script URL no configurada.');
        return;
    }

    let valImporte = parseFloat(importeInput.value);
    const nature = document.querySelector('input[name="nature"]:checked').value;
    
    if (nature === 'gasto') {
        valImporte = -Math.abs(valImporte);
    } else {
        valImporte = Math.abs(valImporte);
    }

    const payload = {
        action: editingRowNumber ? 'edit' : 'add',
        rowNumber: editingRowNumber || '',
        fecha: fechaInput.value,
        pagador: selectedIdentity,
        cuenta: cuentaSelect.value || '',
        importe: valImporte.toString().replace('.', ','), 
        concepto: conceptoInput.value,
        categoria: categoriaSelect.value || '',
        metodo: metodoSelect.value || '',
        tipoMovimiento: tipoMovimientoSelect.value
    };

    setLoading(true);

    try {
        const formData = new URLSearchParams();
        Object.keys(payload).forEach(key => formData.append(key, payload[key]));

        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' 
        });

        const isEditing = !!editingRowNumber;
        resetFormMode();
        alert(isEditing ? '✅ Registro actualizado!' : '✅ Registro guardado!');
        
        fetchAppData();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error(error);
        alert('❌ Error al procesar. Inténtalo de nuevo.');
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        btnSubmit.disabled = true;
    } else {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
        btnSubmit.disabled = false;
    }
}

// --- NAVEGACIÓN Y DASHBOARD ---
const navRegistro = document.getElementById('nav-registro');
const navAnalisis = document.getElementById('nav-analisis');
const viewRegistro = document.getElementById('view-registro');
const viewAnalisis = document.getElementById('view-analisis');

if(navRegistro && navAnalisis) {
    navRegistro.addEventListener('click', () => {
        navRegistro.classList.add('active');
        navAnalisis.classList.remove('active');
        viewRegistro.classList.remove('hidden');
        viewAnalisis.classList.add('hidden');
    });

    navAnalisis.addEventListener('click', () => {
        navAnalisis.classList.add('active');
        navRegistro.classList.remove('active');
        viewAnalisis.classList.remove('hidden');
        viewRegistro.classList.add('hidden');
        renderDashboard();
    });
}

function renderDashboard() {
    if (!appDataGlobal) return;
    const { presupuestos, gastosMensuales, objetivos, gastosEmpresariales, ingresosEmpresariales } = appDataGlobal;
    
    // 1. Presupuestos, Ingresos y Gastos
    const presContainer = document.getElementById('presupuesto-container');
    const ingContainer = document.getElementById('ingresos-container');
    
    // Categorías consideradas ingresos para separarlas:
    const incomeCategories = ['Nómina', 'Ingresos', 'Zumba', 'FullBody', 'Nómina Raúl', 'Nómina Eva', 'Paga Extra Raúl', 'Paga Extra Eva'];
    
    const ingresosMensuales = appDataGlobal.ingresosMensuales || {};

    if (presContainer && ingContainer && presupuestos && presupuestos.length > 0) {
        presContainer.innerHTML = '';
        ingContainer.innerHTML = '';
        let cuentaIngresos = 0;
        let cuentaGastos = 0;

        presupuestos.forEach(p => {
            if (!p.categoria || p.limite <= 0) return;
            
            const catBase = p.categoria.toLowerCase().trim();
            const isIncome = incomeCategories.some(c => catBase.includes(c.toLowerCase())) || catBase.includes('nómina') || catBase.includes('ingreso');
            const trackedObj = isIncome ? ingresosMensuales : gastosMensuales;
            const gastado = trackedObj && trackedObj[p.categoria] ? trackedObj[p.categoria] : 0;
            const limite = p.limite;
            const porcentaje = (gastado / limite) * 100;
            const porcentajeSeguro = Math.min(porcentaje, 100);
            
            let colorClase = 'fill-good';
            if (isIncome) {
                if (porcentaje < 50) colorClase = 'fill-danger';
                else if (porcentaje < 100) colorClase = 'fill-warning';
                else colorClase = 'fill-good';
            } else {
                if (porcentaje > 100) colorClase = 'fill-danger';
                else if (porcentaje >= 80) colorClase = 'fill-warning';
            }

            const fmtG = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(gastado);
            const fmtL = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(limite);

            const divHTML = `
               <div class="progress-group">
                  <div class="progress-header">
                     <span>${p.categoria}</span>
                     <span>${fmtG} / ${fmtL}</span>
                  </div>
                  <div class="progress-track" style="height:12px">
                     <div class="progress-fill fade-in ${colorClase}" style="width: ${porcentajeSeguro}%"></div>
                  </div>
               </div>
            `;
            
            if (isIncome) {
                ingContainer.innerHTML += divHTML;
                cuentaIngresos++;
            } else {
                presContainer.innerHTML += divHTML;
                cuentaGastos++;
            }
        });
        
        if (cuentaGastos === 0) presContainer.innerHTML = '<p class="history-placeholder">Sin límites de gasto configurados.</p>';
        if (cuentaIngresos === 0) ingContainer.innerHTML = '<p class="history-placeholder">Sin previsión de ingresos configurada.</p>';
    }

    // 1.5 Control Empresarial
    const empContainer = document.getElementById('empresarial-container');
    if (empContainer) {
        let totalGastosEmp = 0;
        let totalIngresosEmp = 0;
        
        if (gastosEmpresariales) {
            Object.values(gastosEmpresariales).forEach(val => totalGastosEmp += val);
        }
        if (ingresosEmpresariales) {
            Object.values(ingresosEmpresariales).forEach(val => totalIngresosEmp += val);
        }

        if (totalGastosEmp > 0 || totalIngresosEmp > 0) {
            const fmtGest = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalGastosEmp);
            const fmtIng = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIngresosEmp);
            const balance = totalIngresosEmp - totalGastosEmp;
            const fmtBal = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(balance);

            empContainer.innerHTML = `
               <div class="progress-group" style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-weight: 500;">
                     <span>Ingresos Emp.</span><span style="color: var(--success-color);">${fmtIng}</span>
                  </div>
               </div>
               <div class="progress-group" style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-weight: 500;">
                     <span>Gastos Emp.</span><span style="color: var(--danger-color);">${fmtGest}</span>
                  </div>
               </div>
               <div style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-weight: 600;">
                   <span>Balance Emp.</span><span style="color: ${balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">${fmtBal}</span>
               </div>
            `;
        }
    }

    // 2. Objetivos
    const objContainer = document.getElementById('objetivos-container');
    if (objContainer && objetivos && objetivos.length > 0) {
        objContainer.innerHTML = '';
        objetivos.forEach(o => {
            const meta = o.meta;
            const actual = o.actual;
            const porcentaje = meta > 0 ? (actual / meta) * 100 : 0;
            const porcentajeSeguro = Math.min(porcentaje, 100);
            
            const fmtA = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(actual);
            const fmtM = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(meta);

            let fechaHtml = '';
            if (o.fechaLimite) {
                const f = new Date(o.fechaLimite);
                if (!isNaN(f.getTime())) {
                    const diffDias = Math.ceil((f.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    let colorDias = 'color: var(--text-muted);';
                    let textoDias = `(Faltan ${diffDias} días)`;
                    
                    if (diffDias < 0) {
                        colorDias = 'color: #fca5a5;'; // Red
                        textoDias = `(Venció hace ${Math.abs(diffDias)} días)`;
                    } else if (diffDias <= 15 && porcentaje < 100) {
                        colorDias = 'color: #fcd34d;'; // Amber
                    }
                    if (porcentaje >= 100) {
                        textoDias = `(¡Conseguido!)`;
                        colorDias = 'color: #6ee7b7;'; // Green
                    }
                    
                    fechaHtml = `<div style="font-size: 0.75rem; margin-top: 6px; font-weight: 500; ${colorDias}">📅 Límite: ${f.toLocaleDateString('es-ES')} ${textoDias}</div>`;
                }
            }

            objContainer.innerHTML += `
               <div class="progress-group">
                  <div class="progress-header">
                     <span>${o.nombre}</span>
                     <span>${fmtA} / ${fmtM}</span>
                  </div>
                  <div class="progress-track">
                     <div class="progress-fill fill-neutral" style="width: ${porcentajeSeguro}%"></div>
                  </div>
                  ${fechaHtml}
               </div>
            `;
        });
    }

    generarInsights(presupuestos, gastosMensuales, objetivos);
}

function generarInsights(presupuestos, gastosMensuales, objetivos) {
    const insContainer = document.getElementById('insights-container');
    if (!insContainer) return;
    insContainer.innerHTML = '';
    let hasInsights = false;

    if (presupuestos && presupuestos.length > 0) {
        presupuestos.forEach(p => {
            const gastado = gastosMensuales && gastosMensuales[p.categoria] ? gastosMensuales[p.categoria] : 0;
            const porcentaje = p.limite > 0 ? (gastado / p.limite) * 100 : 0;

            if (porcentaje > 100) {
                insContainer.innerHTML += `<div class="insight-item negative"><span class="insight-icon">⚠️</span><div>Has superado tu presupuesto de <b>${p.categoria}</b>. Intenta reducir gastos aquí.</div></div>`;
                hasInsights = true;
            } else if (porcentaje === 100) {
                insContainer.innerHTML += `<div class="insight-item"><span class="insight-icon">👀</span><div>Has consumido exactamente el 100% de <b>${p.categoria}</b>.</div></div>`;
                hasInsights = true;
            } else if (porcentaje >= 80) {
                insContainer.innerHTML += `<div class="insight-item"><span class="insight-icon">👀</span><div>Ojo con <b>${p.categoria}</b>, estás al ${Math.round(porcentaje)}% de tu límite.</div></div>`;
                hasInsights = true;
            }
        });
    }

    if (objetivos && objetivos.length > 0) {
        let completados = 0;
        objetivos.forEach(o => {
            if (o.actual >= o.meta && o.meta > 0) {
                completados++;
            } else if (o.fechaLimite && o.meta > 0) {
                const f = new Date(o.fechaLimite);
                const hoy = new Date();
                const diffDias = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
                const porcentaje = (o.actual / o.meta) * 100;
                
                if (diffDias > 0 && diffDias <= 30 && porcentaje < 100) {
                    insContainer.innerHTML += `<div class="insight-item"><span class="insight-icon">⏰</span><div>Te faltan ${diffDias} días para el objetivo límite de <b>${o.nombre}</b> y llevas el ${Math.round(porcentaje)}%. ¡Último esfuerzo!</div></div>`;
                    hasInsights = true;
                }
            }
        });
        if (completados > 0) {
            insContainer.innerHTML += `<div class="insight-item positive"><span class="insight-icon">🎉</span><div>¡Felicidades! Has completado ${completados} objetivo(s). Buen trabajo.</div></div>`;
            hasInsights = true;
        }
    }

    if (!hasInsights) {
        insContainer.innerHTML = `<div class="insight-item positive"><span class="insight-icon">📈</span><div>Tus finanzas van por buen camino. Sigue registrando tus movimientos.</div></div>`;
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered', reg.scope))
            .catch(err => console.error('SW Registration failing:', err));
    });
}
