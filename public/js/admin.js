// admin.js - Panel de Administración Tienda WoW (Actualizado)
// console.log('PAGINA CARGADA');

// Variables globales
let currentItems = [];
let currentEditingEntry = null;
let currentTooltipFilename = null;

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


// Abrir selector de archivos
function openTooltipFileSelector() {
    document.getElementById('tooltip-image-file').click();
}

// Configurar eventos del input file
document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('tooltip-image-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleTooltipFileSelect);
    }
});

// Manejar selección de archivo
async function handleTooltipFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validaciones
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
    
    if (file.size > maxSize) {
        showTooltipError('El archivo es muy grande (máx. 5MB)');
        resetFileInput();
        return;
    }
    
    if (!allowedTypes.includes(file.type)) {
        showTooltipError('Formato no permitido. Use JPG, PNG o BMP');
        resetFileInput();
        return;
    }
    
    // Mostrar preview inmediato (sin subir al servidor aún)
    showFilePreview(file);
    
    // Mostrar mensaje informativo
    showTooltipSuccess('Imagen seleccionada. Se subirá al guardar el item.');
}

// Mostrar preview del archivo
function showFilePreview(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const previewContainer = document.getElementById('tooltip-preview-container');
        const previewImg = document.getElementById('current-tooltip-preview');
        const filenameSpan = document.getElementById('current-filename');
        const filesizeSpan = document.getElementById('current-filesize');

        previewImg.src = e.target.result;
        filenameSpan.textContent = file.name;
        filesizeSpan.textContent = formatFileSize(file.size);

        previewContainer.classList.remove('hidden');
    };

    reader.readAsDataURL(file);
}

// Subir archivo al servidor
async function uploadTooltipFile(file) {
    try {
        // Mostrar progress bar
        showUploadProgress(true);

        const formData = new FormData();
        formData.append('tooltipImage', file);

        const response = await axios.post(`/api/admin/items/${currentEditingEntry}/upload-tooltip`,
            formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    updateUploadProgress(percent);
                }
            }
        }
        );

        // Ocultar progress bar
        showUploadProgress(false);

        if (response.data.success) {
            currentTooltipFilename = response.data.filename;
            showTooltipSuccess('Imagen subida correctamente');

            // Actualizar UI
            updateTooltipUIAfterUpload(response.data.filename);

            // Limpiar input file
            resetFileInput();
        }

        return response.data;

    } catch (error) {
        showUploadProgress(false);
        console.error('Error subiendo imagen:', error);

        const errorMsg = error.response?.data?.error ||
            error.message ||
            'Error al subir la imagen';

        showTooltipError(errorMsg);

        // Limpiar preview en caso de error
        document.getElementById('tooltip-preview-container').classList.add('hidden');
        resetFileInput();

        throw error;
    }
}

// Eliminar imagen del tooltip
async function removeTooltipImage() {
    if (!currentEditingEntry || !currentTooltipFilename) {
        showTooltipError('No hay imagen para eliminar');
        return;
    }

    const confirmResult = await Swal.fire({
        title: '¿Eliminar imagen?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const response = await axios.delete(`/api/admin/items/${currentEditingEntry}/remove-tooltip`);

        if (response.data.success) {
            showTooltipSuccess('Imagen eliminada correctamente');

            // Limpiar UI
            document.getElementById('tooltip-preview-container').classList.add('hidden');
            currentTooltipFilename = null;
        }

    } catch (error) {
        console.error('Error eliminando imagen:', error);
        showTooltipError('Error al eliminar la imagen');
    }
}

// Cargar información de tooltip existente al editar
async function loadExistingTooltipInfo(entry) {
    try {
        const response = await axios.get(`/api/admin/items/${entry}/tooltip-info`);

        if (response.data.success && response.data.hasImage) {
            currentTooltipFilename = response.data.filename;

            // Mostrar preview
            const previewContainer = document.getElementById('tooltip-preview-container');
            const previewImg = document.getElementById('current-tooltip-preview');
            const filenameSpan = document.getElementById('current-filename');
            const filesizeSpan = document.getElementById('current-filesize');

            previewImg.src = response.data.url + '?t=' + Date.now(); // Cache busting
            filenameSpan.textContent = response.data.filename;
            filesizeSpan.textContent = 'Cargada';

            previewContainer.classList.remove('hidden');
        } else {
            // No hay imagen
            document.getElementById('tooltip-preview-container').classList.add('hidden');
            currentTooltipFilename = null;
        }

    } catch (error) {
        console.error('Error cargando información del tooltip:', error);
        // Silenciar error, solo no mostrar preview
    }
}

// Actualizar UI después de upload exitoso
function updateTooltipUIAfterUpload(filename) {
    const previewContainer = document.getElementById('tooltip-preview-container');
    const filenameSpan = document.getElementById('current-filename');
    const filesizeSpan = document.getElementById('current-filesize');

    if (!previewContainer.classList.contains('hidden')) {
        filenameSpan.textContent = filename;
        filesizeSpan.textContent = 'Subida';
    }
}

// Actualizar nombre esperado del archivo
function updateExpectedFilename() {
    const entryInput = document.getElementById('item-id');
    const expectedSpan = document.getElementById('expected-filename');

    if (entryInput.value) {
        expectedSpan.textContent = `${entryInput.value}.[ext]`;
    } else {
        expectedSpan.textContent = '[entry].[ext]';
    }
}

// Funciones auxiliares UI
function showTooltipError(message) {
    const errorDiv = document.getElementById('tooltip-error');
    const errorText = document.getElementById('tooltip-error-text');

    errorText.textContent = message;
    errorDiv.classList.remove('hidden');

    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showTooltipSuccess(message) {
    const successDiv = document.getElementById('tooltip-success');
    const successText = document.getElementById('tooltip-success-text');

    successText.textContent = message;
    successDiv.classList.remove('hidden');

    setTimeout(() => {
        successDiv.classList.add('hidden');
    }, 3000);
}

function showUploadProgress(show) {
    const progressDiv = document.getElementById('upload-progress');
    if (show) {
        progressDiv.classList.remove('hidden');
        updateUploadProgress(0);
    } else {
        progressDiv.classList.add('hidden');
    }
}

function updateUploadProgress(percent) {
    document.getElementById('upload-percent').textContent = percent + '%';
    document.getElementById('upload-progress-bar').style.width = percent + '%';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetFileInput() {
    document.getElementById('tooltip-image-file').value = '';
}

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

// inicializar tooltip
function showAddItemModal() {
    document.getElementById('modal-title').innerHTML = '<i class="fas fa-plus mr-2"></i>Agregar Nuevo Item';
    document.getElementById('item-form').reset();
    document.getElementById('item-entry').value = '';
    document.getElementById('status-field').classList.add('hidden');
    document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Item';

    // Establecer categoría por defecto
    document.getElementById('item-category').value = 'Armadura de placas';

    // Inicializar tooltip upload
    currentEditingEntry = null;
    currentTooltipFilename = null;
    document.getElementById('tooltip-preview-container').classList.add('hidden');
    document.getElementById('upload-btn-text').textContent = 'Subir Imagen';
    document.getElementById('expected-filename').textContent = '[entry].[ext]';

    // Limpiar mensajes
    document.getElementById('tooltip-error').classList.add('hidden');
    document.getElementById('tooltip-success').classList.add('hidden');

    // Configurar event listener para entry input
    const entryInput = document.getElementById('item-id');
    entryInput.removeEventListener('input', updateExpectedFilename);
    entryInput.addEventListener('input', updateExpectedFilename);

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
            document.getElementById('item-cost').value = item.token_cost;

            // Estado (solo visible en edición)
            document.querySelector(`input[name="estado"][value="${item.estado}"]`).checked = true;
            document.getElementById('status-field').classList.remove('hidden');

            document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save mr-2"></i>Actualizar Item';

            // Inicializar tooltip upload
            currentEditingEntry = item.entry;
            currentTooltipFilename = item.tooltip_image || null;

            // Actualizar nombre esperado
            updateExpectedFilename();

            // Cambiar texto del botón de upload
            document.getElementById('upload-btn-text').textContent = item.tooltip_image ? 'Reemplazar Imagen' : 'Subir Imagen';

            // Cargar información del tooltip existente
            await loadExistingTooltipInfo(item.entry);

            // Configurar event listener para entry input
            const entryInput = document.getElementById('item-id');
            entryInput.removeEventListener('input', updateExpectedFilename);
            entryInput.addEventListener('input', updateExpectedFilename);

            // Limpiar mensajes
            document.getElementById('tooltip-error').classList.add('hidden');
            document.getElementById('tooltip-success').classList.add('hidden');

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
    const originalEntry = document.getElementById('item-entry').value;
    const isEdit = originalEntry !== '';
    const entry = formData.get('entry');

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

    try {
        // Crear FormData para enviar archivo si existe
        const uploadFormData = new FormData();

        // Agregar campos del formulario
        uploadFormData.append('entry', entry);
        uploadFormData.append('name', formData.get('name'));
        uploadFormData.append('category', category || 'Armadura de placas');
        uploadFormData.append('token_cost', formData.get('token_cost'));

        if (isEdit) {
            uploadFormData.append('original_entry', originalEntry);
            uploadFormData.append('estado', formData.get('estado'));
        }

        // Agregar archivo si se seleccionó uno
        const fileInput = document.getElementById('tooltip-image-file');
        if (fileInput.files[0]) {
            uploadFormData.append('tooltipImage', fileInput.files[0]);
        }

        // Mostrar loading
        Swal.fire({
            title: isEdit ? 'Actualizando item...' : 'Creando item...',
            text: 'Procesando imagen y guardando en base de datos',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Enviar TODO en una sola petición
        const response = await axios.post('/api/admin/items/with-image',
            uploadFormData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }
        );

        if (response.data.success) {
            Swal.close();
            closeModal();
            await loadItems();

            Swal.fire({
                icon: 'success',
                title: isEdit ? '¡Item actualizado!' : '¡Item agregado!',
                text: response.data.message,
                confirmButtonColor: '#0068caff'
            });
        } else {
            Swal.close();
            showError(response.data.error || 'Error desconocido');
        }

    } catch (error) {
        Swal.close();
        console.error('Error guardando item:', error);

        const errorMsg = error.response?.data?.error ||
            error.message ||
            'Error de conexión';

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

    // Limpiar tooltip variables
    currentEditingEntry = null;
    currentTooltipFilename = null;

    // Resetear input file
    resetFileInput();
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