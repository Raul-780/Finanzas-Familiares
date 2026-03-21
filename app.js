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
const btnText = btnSubmit.querySelector('.btn-text');
const loader = btnSubmit.querySelector('.loader');
const natureRadios = document.querySelectorAll('input[name="nature"]');
const historyList = document.getElementById('history-list');

// App State
let selectedIdentity = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date
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
        identities.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIdentity = btn.dataset.id;
        idError.textContent = ''; // clear error
        
        // Business Logic: If Niños, default to category 'Otros' or 'Hijos'
        if (selectedIdentity === 'Niños') {
            const opts = Array.from(categoriaSelect.options).map(o => o.value);
            if (opts.includes('Hijos')) categoriaSelect.value = 'Hijos';
            else if (opts.includes('Otros')) categoriaSelect.value = 'Otros';
        }
    });
});

// Business Logic: Concept contains "Cajero" or "Sacar" -> Traspaso
conceptoInput.addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase();
    if (text.includes('cajero') || text.includes('sacar')) {
        tipoMovimientoSelect.value = 'Traspaso';
    } else if (tipoMovimientoSelect.value === 'Traspaso' && !(text.includes('cajero') || text.includes('sacar'))) {
        // Option to revert to Flujo Real if they delete it, usually leave it up to user.
        tipoMovimientoSelect.value = 'Flujo Real';
    }
});

// Fetch Init Data from Google Sheets
async function fetchAppData() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        populateSelect(cuentaSelect, data.cuentas, 'Gasto Personal');
        populateSelect(categoriaSelect, data.categorias, '');
        populateSelect(metodoSelect, data.metodos, '');
        
        renderHistory(data.historial);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error al conectar con Google Sheets. Comprueba tu URL (debe estar publicada, acceso Cualquiera).');
    }
}

function populateSelect(selectEl, optionsArray, defaultValue) {
    if (!optionsArray || optionsArray.length === 0) return;
    selectEl.innerHTML = '';
    optionsArray.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        selectEl.appendChild(option);
    });
    if (defaultValue && optionsArray.includes(defaultValue)) {
        selectEl.value = defaultValue;
    }
}

function renderHistory(historyArray) {
    if (!historyArray || historyArray.length === 0) {
        historyList.innerHTML = '<div class="history-placeholder">Sin registros recientes.</div>';
        return;
    }
    historyList.innerHTML = '';
    historyArray.forEach(item => {
        const isExpense = parseFloat(item.importe) < 0;
        const formattedAmount = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.importe);
        
        const dateStr = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '';

        const div = document.createElement('div');
        div.className = `history-item ${isExpense ? 'expense' : 'income'}`;
        div.innerHTML = `
            <div class="history-info">
                <span class="history-date">${dateStr}</span>
                <span class="history-concepto">${item.concepto}</span>
            </div>
            <span class="history-amount ${isExpense ? 'expense' : 'income'}">${formattedAmount}</span>
        `;
        historyList.appendChild(div);
    });
}

// Submitting Form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedIdentity) {
        idError.textContent = '✗ Debes seleccionar quién paga.';
        // scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    if (!SCRIPT_URL) {
        alert('Script URL no configurada.');
        return;
    }

    // Prepare data
    let valImporte = parseFloat(importeInput.value);
    const nature = document.querySelector('input[name="nature"]:checked').value;
    
    // Gasto = Negativo, Ingreso = Positivo
    if (nature === 'gasto') {
        valImporte = -Math.abs(valImporte);
    } else {
        valImporte = Math.abs(valImporte);
    }

    const payload = {
        fecha: fechaInput.value,
        pagador: selectedIdentity,
        cuenta: cuentaSelect.value || '',
        importe: valImporte.toString().replace('.', ','), // Para sheets europeo
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
            // no-cors mode would be needed if apps script doesn't allow standard fetch, 
            // but fetching a POST via Apps script x-www-form-urlencoded works natively.
            // If CORS issues arise, Apps script returns opaque response, which causes an exception if we await json().
            // So we handle opaque responses safely:
            mode: 'no-cors' 
        });

        // Como usamos no-cors, la respuesta siempre parece oculta. Asumimos éxito.
        alert('✅ Registro guardado con éxito!');
        form.reset();
        identities.forEach(b => b.classList.remove('selected'));
        selectedIdentity = null;
        fechaInput.valueAsDate = new Date();
        
        // Refrescar historial silenciosamente
        fetchAppData();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error(error);
        alert('❌ Error al guardar. Inténtalo de nuevo.');
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
