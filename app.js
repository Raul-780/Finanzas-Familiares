const API_KEY = 'finance_api_url';
let SCRIPT_URL = localStorage.getItem(API_KEY);

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fechaInput.valueAsDate = new Date();

    if (!SCRIPT_URL) {
        document.getElementById('config-modal').classList.remove('hidden');
    } else {
        fetchAppData();
    }
});

// Setup Config Modal
document.getElementById('btn-save-api').addEventListener('click', () => {
    const url = document.getElementById('api-url').value.trim();
    if (url.startsWith('https://script.google.com/')) {
        localStorage.setItem(API_KEY, url);
        SCRIPT_URL = url;
        document.getElementById('config-modal').classList.add('hidden');
        fetchAppData();
    } else {
        alert('URL inválida. Debe ser una URL de Google Apps Script.');
    }
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
        renderHistory();
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

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered', reg.scope))
            .catch(err => console.error('SW Registration failing:', err));
    });
}
