// admin.js - Panel de Administración Tienda WoW (Actualizado)
// console.log('PAGINA CARGADA');

// Variables globales
let currentItems = [];

// Lista de categorías válidas (debe coincidir con adminRoutes.js)
const VALID_CATEGORIES = [
    'Hacha',
    'Hacha de dos manos',
    'Espada',
    'Espada de dos manos',
    'Maza',
    'Maza de dos manos',
    'Arma de asta',
    'Bastón',
    'Daga',
    'Arma de puño',
    'Armadura de tela',
    'Armadura de cuero',
    'Armadura de malla',
    'Armadura de placas',
    'Escudo',
    'Anillo',
    'Cuello',
    'Abalorio',
    'Capa',
    'Bolsa',
    'Gema',
    'Encantamiento'
];

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    loadItems();
});

// Cargar items desde la API
async function loadItems() {
    try {
        showLoading(true);

        const response = await axios.get('/api/admin/items');

        if (response.data.success) {
            currentItems = response.data.items;
            displayItems(currentItems);
            updateStats(currentItems);
        } else {
            showError('Error cargando items: ' + (response.data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error cargando items:', error);
        showError('Error de conexión con el servidor');
    } finally {
        showLoading(false);
    }
}

// Mostrar items en la tabla
function displayItems(items) {
    const tbody = document.getElementById('items-table-body');

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-gray-400">
                    <i class="fas fa-box-open text-4xl mb-4"></i>
                    <p class="text-xl">No hay items en la tienda</p>
                    <p class="text-sm">Agrega tu primer item usando el botón "Agregar Nuevo Item"</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr class="table-row">
            <td class="py-4 px-6 font-bold">${item.entry}</td>
            <td class="py-4 px-6">
                <div class="font-medium" style="font-family: Arial, sans-serif;">${item.name}</div>
                ${item.tooltip_image ? `
                    <div class="text-xs text-blue-400 mt-1" style="font-family: Arial, sans-serif;">
                        <i class="fas fa-image mr-1"></i>${item.tooltip_image}
                    </div>
                ` : ''}
            </td>
            <td class="py-4 px-6">
                <span class="category-badge">${item.category || 'Sin categoría'}</span>
            </td>
            <td class="py-4 px-6">
                <div class="flex items-center">
                    <i class="fas fa-coins text-yellow-400 mr-2"></i>
                    <span class="font-bold">${item.token_cost}</span>
                </div>
            </td>
            <td class="py-4 px-6">
                ${item.estado == 1 ?
            '<span class="status-active"><i class="fas fa-check mr-1"></i>Activo</span>' :
            '<span class="status-inactive"><i class="fas fa-times mr-1"></i>Inactivo</span>'}
            </td>
            <td class="py-4 px-6">
                <div class="flex items-center">
                    <i class="fas fa-shopping-cart text-green-400 mr-2"></i>
                    <span>${item.times || 0}</span>
                </div>
                ${item.stars > 0 ? `
                    <div class="flex items-center mt-1">
                        <i class="fas fa-star text-yellow-400 mr-1 text-xs"></i>
                        <span class="text-xs">${parseFloat(item.stars).toFixed(1)}/10</span>
                        <span class="text-xs text-gray-400 ml-1">(${item.total_ratings})</span>
                    </div>
                ` : ''}
            </td>
            <td class="py-4 px-6">
                <div class="flex space-x-2">
                    <button onclick="editItem(${item.entry})" class="btn-epic text-sm py-2 px-3">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                    ${item.estado == 1 ? `
                        <button onclick="deactivateItem(${item.entry})" class="btn-danger text-sm py-2 px-3">
                            <i class="fas fa-ban mr-1"></i>Desactivar
                        </button>
                    ` : `
                        <button onclick="activateItem(${item.entry})" class="btn-gold text-sm py-2 px-3">
                            <i class="fas fa-check mr-1"></i>Activar
                        </button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

// Actualizar estadísticas
function updateStats(items) {
    const totalItems = items.length;
    const activeItems = items.filter(item => item.estado == 1).length;

    // Contar categorías únicas
    const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
    const totalCategories = uniqueCategories.length;

    const totalTokens = items.reduce((sum, item) => sum + (item.token_cost * (item.times || 0)), 0);

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('active-items').textContent = activeItems;
    document.getElementById('total-categories').textContent = totalCategories;
    document.getElementById('total-tokens').textContent = totalTokens;
}

// Mostrar modal para agregar item
function showAddItemModal() {
    document.getElementById('modal-title').innerHTML = '<i class="fas fa-plus mr-2"></i>Agregar Nuevo Item';
    document.getElementById('item-form').reset();
    document.getElementById('item-entry').value = ''; // Hidden vacío
    document.getElementById('status-field').classList.add('hidden');
    document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Item';

    // Establecer categoría por defecto
    document.getElementById('item-category').value = 'Armadura de placas';

    const modal = document.getElementById('item-modal');
    modal.classList.remove('hidden');
}

// Mostrar modal para editar item
async function editItem(entry) {
    try {
        const response = await axios.get(`/api/admin/items/${entry}`);

        if (response.data.success) {
            const item = response.data.item;

            document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit mr-2"></i>Editar Item';
            document.getElementById('item-form').reset();

            // Para edición: guardar el entry original en el hidden
            document.getElementById('item-entry').value = item.entry;

            // Llenar campos visibles
            document.getElementById('item-id').value = item.entry;
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-category').value = item.category || 'Armadura de placas';
            document.getElementById('item-tooltip-image').value = item.tooltip_image || '';
            document.getElementById('item-cost').value = item.token_cost;

            // Estado (solo visible en edición)
            document.querySelector(`input[name="estado"][value="${item.estado}"]`).checked = true;
            document.getElementById('status-field').classList.remove('hidden');

            document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save mr-2"></i>Actualizar Item';

            const modal = document.getElementById('item-modal');
            modal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error cargando item para editar:', error);
        showError('Error cargando datos del item');
    }
}

// Enviar formulario (crear o actualizar)
document.getElementById('item-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const originalEntry = document.getElementById('item-entry').value; // Hidden field
    const isEdit = originalEntry !== '';

    // Para creación: entry viene del campo visible (item-id)
    // Para edición: entry es el original (hidden) pero usamos el visible para mostrar
    const entry = isEdit ? originalEntry : formData.get('entry');

    // Validar entry
    if (!entry || entry <= 0) {
        showError('ID del item (entry) es requerido y debe ser un número positivo');
        return;
    }

    // Validar categoría
    const category = formData.get('category');
    if (category && !VALID_CATEGORIES.includes(category)) {
        showError(`Categoría inválida. Debe ser una de: ${VALID_CATEGORIES.join(', ')}`);
        return;
    }

    const data = {
        entry: entry,
        name: formData.get('name'),
        category: category || 'Armadura de placas',
        tooltip_image: formData.get('tooltip_image') || null,
        token_cost: formData.get('token_cost')
    };

    // Solo agregar estado si es edición
    if (isEdit) {
        data.estado = formData.get('estado');
    }

    // console.log('DEBUG - Datos a enviar:', data);

    try {
        let response;

        if (isEdit) {
            // Para edición: usar el entry original como parámetro de ruta
            response = await axios.put(`/api/admin/items/${originalEntry}`, data);
        } else {
            // Para creación: enviar normalmente
            response = await axios.post('/api/admin/items', data);
        }

        if (response.data.success) {
            closeModal();
            await loadItems();
            Swal.fire({
                icon: 'success',
                title: isEdit ? '¡Item actualizado!' : '¡Item agregado!',
                text: response.data.message,
                confirmButtonColor: '#0068caff'
            });
        } else {
            showError(response.data.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error guardando item:', error);
        const errorMsg = error.response?.data?.error || 'Error de conexión';
        showError(errorMsg);
    }
});

// Desactivar item
async function deactivateItem(entry) {
    const result = await Swal.fire({
        title: '¿Desactivar item?',
        text: 'El item dejará de estar disponible en la tienda',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await axios.delete(`/api/admin/items/${entry}`);
            await loadItems();
            Swal.fire('¡Desactivado!', 'El item ha sido desactivado.', 'success');
        } catch (error) {
            console.error('Error desactivando item:', error);
            showError('Error desactivando item');
        }
    }
}

// Activar item
async function activateItem(entry) {
    try {
        await axios.put(`/api/admin/items/${entry}/reactivate`);
        await loadItems();
        Swal.fire('¡Activado!', 'El item ha sido reactivado.', 'success');
    } catch (error) {
        console.error('Error activando item:', error);
        showError('Error activando item');
    }
}

// Cerrar modal
function closeModal() {
    document.getElementById('item-modal').classList.add('hidden');
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    const tableBody = document.getElementById('items-table-body');

    if (show) {
        loading.classList.remove('hidden');
        tableBody.innerHTML = '';
    } else {
        loading.classList.add('hidden');
    }
}

// Mostrar error
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#0068caff',
    });
}

// Cerrar sesión
function logout() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Serás redirigido al inicio de sesión',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/auth/logout';
        }
    });
}