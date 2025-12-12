// Configuración de Axios
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Variables globales
let userCharacters = [];
let currentPurchaseData = null;
let currentCategory = null;
let categoriesList = [];
let tooltipTimeout = null;
let currentHoveredItem = null;

// Función para escapar strings para uso en HTML/JavaScript
function escapeString(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

// Función para decodificar entidades HTML
function decodeHTMLEntities(text) {
    if (!text) return '';
    
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#96;': '`'
    };
    
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#96;/g, 
        match => entities[match] || match);
}

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    loadUserInfo();
    loadUserCharacters();
    loadCategories();

    // Configurar formulario de cambio de contraseña
    setupPasswordForm();

    // Limpiar tooltip al hacer scroll
    window.addEventListener('scroll', function () {
        clearFloatingTooltip();
    });

    // Limpiar tooltip al redimensionar ventana
    window.addEventListener('resize', function () {
        clearFloatingTooltip();
    });

    // Limpiar errores al escribir en los campos
    ['current-password', 'new-password', 'confirm-password'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function () {
                clearFieldError(fieldId);
            });
        }
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const accountModal = document.getElementById('account-modal');
            if (accountModal && !accountModal.classList.contains('hidden')) {
                closeAccountModal();
            }
        }
    });

    // Cerrar modal haciendo clic fuera
    const accountModal = document.getElementById('account-modal');
    if (accountModal) {
        accountModal.addEventListener('click', function (e) {
            if (e.target === accountModal) {
                closeAccountModal();
            }
        });
    }
});

// Cargar información del usuario
async function loadUserInfo() {
    try {
        document.getElementById('username').textContent = 'Cargando...';

        const response = await fetch('/api/user');

        if (!response.ok) {
            throw new Error('Error al obtener datos del usuario');
        }

        const userData = await response.json();
        const userTokens = await getUserTokens();

        document.getElementById('user-tokens').textContent = userTokens;
        document.getElementById('username').textContent = userData.username;

        await checkAndShowAdminButton(userData.username);

    } catch (error) {
        console.error('Error cargando información del usuario:', error);
        showError('Error cargando información del usuario');
    }
}

async function checkAndShowAdminButton(username) {
    try {
        const response = await axios.post('/api/admin/check-permissions', {
            username: username
        });

        if (response.data.isAdmin) {
            const adminBtnContainer = document.getElementById('admin-button-container');
            adminBtnContainer.classList.remove('hidden');
        }
    } catch (error) {
        const adminBtnContainer = document.getElementById('admin-button-container');
        adminBtnContainer.classList.add('hidden');
    }
}


// Cargar TODOS los items (sin categoría)
async function loadAllItems() {
    try {
        // Mostrar loading
        document.getElementById('items-grid').classList.add('hidden');
        document.getElementById('no-items-message').classList.add('hidden');
        document.getElementById('items-loading').classList.remove('hidden');

        const response = await axios.get('/api/items/all?limit=100');

        // Ocultar loading
        document.getElementById('items-loading').classList.add('hidden');

        if (response.data.success && response.data.items.length > 0) {
            displayItemsByCategory(response.data.items);
            document.getElementById('items-grid').classList.remove('hidden');
        } else {
            document.getElementById('no-items-message').classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error cargando todos los items:', error);
        document.getElementById('items-loading').classList.add('hidden');
        document.getElementById('no-items-message').classList.remove('hidden');
        showError('Error al cargar todos los items');
    }
}


// Cargar personajes del usuario
async function loadUserCharacters() {
    try {
        const response = await axios.get('/api/purchase/characters');
        userCharacters = response.data.characters || [];
    } catch (error) {
        console.error('Error cargando personajes:', error);
        userCharacters = [];
    }
}

// Cargar categorías disponibles
async function loadCategories() {
    try {
        const response = await axios.get('/api/items/categories');

        if (response.data.success && response.data.categories.length > 0) {
            categoriesList = response.data.categories;
            displayCategories(categoriesList);

            // Cargar TODOS los items por defecto
            await selectAllItems();
        } else {
            showError('No se encontraron categorías');
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
        showError('Error al cargar las categorías');
    }
}

// Mostrar categorías en la navegación
function displayCategories(categories) {
    const container = document.getElementById('categories-nav');

    if (!categories || categories.length === 0) {
        container.innerHTML = '<p class="text-white">No hay categorías disponibles</p>';
        return;
    }

    // Agregar botón "Todos" al inicio
    const allButton = `
        <button class="category-btn ${currentCategory === 'Todos' ? 'active' : ''}" 
                onclick="selectAllItems()">
            <i class="fas fa-th-large mr-2"></i>Todos
        </button>
    `;

    const categoryButtons = categories.map(category => `
        <button class="category-btn ${currentCategory === category ? 'active' : ''}" 
                onclick="selectCategory('${category}')">
            ${category}
        </button>
    `).join('');

    container.innerHTML = allButton + categoryButtons;
}

// Seleccionar todos los items
async function selectAllItems() {
    if (currentCategory === 'Todos') return;

    // Limpiar tooltip flotante
    clearFloatingTooltip();
    
    currentCategory = 'Todos';

    // Actualizar botones activos
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.innerHTML.includes('Todos') || btn.textContent === 'Todos') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Actualizar título
    document.getElementById('current-category-title').innerHTML = `
        <i class="fas fa-th-large mr-3"></i>TODOS LOS ITEMS
    `;

    // Cargar todos los items
    await loadAllItems();
}

// Seleccionar una categoría
async function selectCategory(category) {
    if (currentCategory === category) return;

    // Limpiar tooltip flotante
    clearFloatingTooltip();
    
    currentCategory = category;

    // Actualizar botones activos
    document.querySelectorAll('.category-btn').forEach(btn => {
        const btnText = btn.textContent || btn.innerText;
        if (btnText === category || (btnText.includes('Todos') && category !== 'Todos')) {
            if (category === 'Todos') {
                btn.classList.add('active');
            } else if (btnText === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        } else {
            btn.classList.remove('active');
        }
    });

    // Actualizar título
    document.getElementById('current-category-title').innerHTML = `
        <i class="fas fa-box-open mr-3"></i>${category}
    `;

    // Cargar items de la categoría
    await loadItemsByCategory(category);
}

// Cargar items por categoría
async function loadItemsByCategory(category) {
    try {
        // Mostrar loading
        document.getElementById('items-grid').classList.add('hidden');
        document.getElementById('no-items-message').classList.add('hidden');
        document.getElementById('items-loading').classList.remove('hidden');

        const response = await axios.get(`/api/items/category/${encodeURIComponent(category)}?limit=50`);

        // Ocultar loading
        document.getElementById('items-loading').classList.add('hidden');

        if (response.data.success && response.data.items.length > 0) {
            displayItemsByCategory(response.data.items);
            document.getElementById('items-grid').classList.remove('hidden');
        } else {
            document.getElementById('no-items-message').classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error cargando items por categoría:', error);
        document.getElementById('items-loading').classList.add('hidden');
        document.getElementById('no-items-message').classList.remove('hidden');
        showError('Error al cargar los items de la categoría');
    }
}

// Mostrar items en la grid
function displayItemsByCategory(items) {
    const container = document.getElementById('items-grid');

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-box-open text-gray-400 text-6xl mb-4"></i>
                <p class="text-white text-xl">No hay items en esta categoría</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const iconUrl = item.icon_url || '/icons/inv_misc_questionmark.jpg';
        const ratingText = item.stars > 0 ? item.stars : 'Nuevo';
        
        // Crear objeto con datos del item para JSON
        const itemData = {
            entry: item.entry,
            name: item.name,
            icon: iconUrl,
            tooltip: item.tooltip_image || ''
        };
        
        // Convertir a string JSON seguro
        const itemDataJson = JSON.stringify(itemData)
            .replace(/"/g, '&quot;') // Escapar comillas para atributo HTML
            .replace(/'/g, '&#39;'); // Escapar apóstrofes también

        return `
            <div class="item-card rounded-xl p-4 border-gold" 
                 data-item='${itemDataJson}'
                 onclick="handleItemClick(this)"
                 onmouseenter="handleItemHover(this, event)"
                 onmouseleave="handleItemLeave(this)"
                 onmousemove="handleItemMouseMove(event)">
                <div class="text-center mb-3">
                    <div class="inline-flex bg-gray-800 rounded-lg p-1 mb-2 overflow-hidden">
                        <img src="${iconUrl}" alt="${escapeString(item.name)}" 
                             class="w-14 h-14 object-cover rounded item-icon"
                             onerror="this.src='/icons/inv_misc_questionmark.jpg'; this.onerror=null;">
                    </div>
                </div>
                <h3 class="font-bold text-white text-center mb-2 truncate">${item.name}</h3>
                <div class="flex justify-between items-center">
                    <span class="text-yellow-400 font-bold">${item.token_cost} <i class="fas fa-coins"></i></span>
                    <div class="flex items-center space-x-1">
                        <i class="fas fa-shopping-cart text-green-400"></i>
                        <span class="text-white text-sm">${item.times}</span>
                    </div>
                </div>
                ${item.stars > 0 ? `
                    <div class="flex justify-center items-center mt-2 space-x-1">
                        <i class="fas fa-star text-yellow-400 text-xs"></i>
                        <span class="text-yellow-400 text-xs">${ratingText}</span>
                        <span class="text-gray-400 text-xs">(${item.total_ratings})</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Ocultar tooltip
function hideItemTooltip(entry) {
    if (currentHoveredItem === entry) {
        currentHoveredItem = null;

        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }

        const tooltip = document.getElementById('floating-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');

            // Ocultar completamente después de la animación
            setTimeout(() => {
                if (tooltip && !tooltip.classList.contains('visible')) {
                    tooltip.style.display = 'none';
                }
            }, 200);
        }
    }
}

// Actualizar posición del tooltip
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('floating-tooltip');
    if (!tooltip || !tooltip.classList.contains('visible')) return;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Mostrar tooltip
    tooltip.style.display = 'block';

    // Calcular posición - AL LADO DEL CURSOR
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();

    // Offset desde el cursor
    const offsetX = 15; // 15px a la derecha del cursor
    const offsetY = 15; // 15px abajo del cursor

    let posX = mouseX + offsetX;
    let posY = mouseY + offsetY;

    // Ajustar si se sale de la pantalla a la derecha
    if (posX + tooltipRect.width > viewportWidth - 10) {
        // Mostrar a la IZQUIERDA del cursor
        posX = mouseX - tooltipRect.width - offsetX;

        // Si todavía se sale por la izquierda, ajustar al borde
        if (posX < 10) {
            posX = 10;
        }
    }

    // Ajustar si se sale de la pantalla abajo
    if (posY + tooltipRect.height > viewportHeight - 10) {
        // Mostrar ARRIBA del cursor
        posY = mouseY - tooltipRect.height - offsetY;

        // Si todavía se sale por arriba, ajustar al borde
        if (posY < 10) {
            posY = 10;
        }
    }

    // Ajustar si se sale de la pantalla a la izquierda (después de cambiar a izquierda)
    if (posX < 10) {
        posX = 10;
    }

    // Ajustar si se sale de la pantalla arriba (después de cambiar arriba)
    if (posY < 10) {
        posY = 10;
    }

    // Aplicar posición
    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
}

// Limpiar tooltip al cambiar de categoría
function clearFloatingTooltip() {
    const tooltip = document.getElementById('floating-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
    currentHoveredItem = null;
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
}

// Mostrar detalles simplificados del item
async function showSimpleItemDetails(entry) {
    try {
        const response = await axios.get(`/api/items/details/${entry}`);

        if (!response.data.success || !response.data.item) {
            throw new Error('Item no encontrado');
        }

        const item = response.data.item;
        const iconUrl = item.icon_url || '/icons/inv_misc_questionmark.jpg';

        // Escapar el nombre para uso seguro
        const safeName = escapeString(item.name);

        document.getElementById('simple-modal-title').textContent = item.name;
        document.getElementById('simple-modal-price').textContent = item.token_cost;

        const ratingText = item.stars > 0 ? item.stars : 'Nuevo';
        document.getElementById('simple-modal-rating').textContent = ratingText;
        document.getElementById('simple-modal-rating-count').textContent =
            item.total_ratings > 0 ? `${item.total_ratings} calificaciones` : 'Sin calificar';

        document.getElementById('simple-modal-times').innerHTML = `
            <i class="fas fa-shopping-cart text-green-400 mr-2"></i>
            <span>${item.times}</span>
        `;

        document.getElementById('simple-modal-total-ratings').textContent = item.total_ratings;

        // Configurar contenedor del tooltip con icono
        const tooltipContainer = document.querySelector('.modal-tooltip-container');
        
        if (item.tooltip_image) {
            tooltipContainer.innerHTML = `
                <div class="modal-tooltip-with-icon">
                    <div class="modal-icon-container">
                        <img src="${iconUrl}" 
                             alt="Icono de ${safeName}" 
                             class="modal-icon"
                             onerror="this.src='/icons/inv_misc_questionmark.jpg'">
                    </div>
                    <div class="modal-tooltip-image">
                        <img src="/tooltips/${item.tooltip_image}" 
                             alt="Tooltip de ${safeName}" 
                             class="tooltip-image"
                             onerror="this.src='/icons/inv_misc_questionmark.jpg'; this.onerror=null;">
                    </div>
                </div>
            `;
        } else {
            tooltipContainer.innerHTML = `
                <div class="modal-tooltip-with-icon">
                    <div class="modal-icon-container">
                        <img src="${iconUrl}" 
                             alt="Icono de ${safeName}" 
                             class="modal-icon"
                             onerror="this.src='/icons/inv_misc_questionmark.jpg'">
                    </div>
                    <div class="modal-tooltip-image">
                        <img src="/icons/inv_misc_questionmark.jpg" 
                             alt="Tooltip no disponible" 
                             class="tooltip-image">
                        <p class="text-gray-400 text-center mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            Tooltip no disponible para este item
                        </p>
                    </div>
                </div>
            `;
        }

        // Configurar botón de compra
        const buyBtn = document.getElementById('simple-modal-buy-btn');
        buyBtn.onclick = () => initiateSimplePurchase(entry, item.name, item.token_cost);

        // Mostrar modal
        document.getElementById('simple-item-modal').classList.remove('hidden');

    } catch (error) {
        console.error('Error cargando detalles del item:', error);
        showError('Error al cargar los detalles del item: ' + error.message);
    }
}

// Iniciar compra desde modal simple
async function initiateSimplePurchase(itemEntry, itemName, itemCost) {
    if (userCharacters.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin personajes',
            text: 'No tienes personajes disponibles para recibir el item',
            confirmButtonColor: '#0068caff'
        });
        return;
    }

    const characterOptions = userCharacters.map(char =>
        `${char.name} (Nivel ${char.level})`
    ).join('|');

    const { value: selectedChar } = await Swal.fire({
        title: 'Seleccionar personaje',
        input: 'select',
        inputOptions: characterOptions.split('|').reduce((acc, char, index) => {
            acc[index] = char;
            return acc;
        }, {}),
        inputPlaceholder: 'Selecciona un personaje',
        showCancelButton: true,
        confirmButtonColor: '#0068caff',
        cancelButtonColor: '#e53e3e',
        confirmButtonText: 'Comprar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return 'Debes seleccionar un personaje';
            }
        }
    });

    if (selectedChar !== undefined) {
        const selectedCharacter = userCharacters[selectedChar];
        await processSimplePurchase(itemEntry, itemName, itemCost, selectedCharacter);
    }
}

// Procesar compra simple
async function processSimplePurchase(itemEntry, itemName, itemCost, character) {
    try {
        Swal.fire({
            title: 'Validando compra...',
            html: `
                <div class="text-left">
                    <p><strong>Item:</strong> ${escapeString(itemName)}</p>
                    <p><strong>Personaje:</strong> ${escapeString(character.name)} (Nivel ${character.level})</p>
                    <p><strong>Costo:</strong> ${itemCost} tokens</p>
                    <p><strong>Validando requisitos...</strong></p>
                </div>
            `,
            icon: 'info',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const validationResponse = await axios.post('/api/purchase/validate', {
            characterGuid: character.guid,
            itemEntry: itemEntry,
            characterName: character.name
        });

        Swal.close();

        if (!validationResponse.data.valid) {
            throw new Error(validationResponse.data.error || 'Validación fallida');
        }

        await Swal.fire({
            icon: 'success',
            title: '¡Validación exitosa!',
            html: `
                <div class="text-left">
                    <p><strong>Item:</strong> ${escapeString(itemName)}</p>
                    <p><strong>Costo:</strong> ${itemCost} tokens</p>
                    <p><strong>Saldo actual:</strong> ${validationResponse.data.currentTokens} tokens</p>
                    <p><strong>Personaje:</strong> ${escapeString(character.name)}</p>
                    <p class="text-yellow-400 mt-3"><i class="fas fa-star mr-2"></i>¡Ahora califica el item antes de confirmar!</p>
                </div>
            `,
            confirmButtonColor: '#0068caff',
            confirmButtonText: 'Calificar Item'
        });

        currentPurchaseData = {
            itemEntry: validationResponse.data.itemEntry,
            characterGuid: character.guid,
            itemName: validationResponse.data.itemName,
            characterName: validationResponse.data.characterName,
            itemCost: validationResponse.data.itemCost,
            currentTokens: validationResponse.data.currentTokens
        };

        closeSimpleModal();
        showRatingModal();

    } catch (error) {
        Swal.close();
        console.error('Error en validación de compra:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error en validación',
            text: error.response?.data?.error || error.message || 'Error desconocido',
            confirmButtonColor: '#0068caff',
        });
    }
}

// Cerrar modal simple
function closeSimpleModal() {
    document.getElementById('simple-item-modal').classList.add('hidden');
    // Limpiar tooltip flotante por si acaso
    clearFloatingTooltip();
}

// Modal de calificación (funciones existentes - mantener igual)
function showRatingModal() {
    if (!currentPurchaseData) return;

    const modal = document.getElementById('rating-modal');
    const itemName = document.getElementById('rating-item-name');
    const starsContainer = document.getElementById('rating-stars');
    const submitBtn = document.getElementById('submit-rating-btn');

    itemName.textContent = currentPurchaseData.itemName;
    starsContainer.innerHTML = '';

    let selectedRating = 0;

    for (let i = 1; i <= 10; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.innerHTML = '★';
        star.dataset.rating = i;

        star.addEventListener('click', function () {
            selectedRating = parseInt(this.dataset.rating);
            updateStars(starsContainer, selectedRating);
            submitBtn.disabled = false;
        });

        starsContainer.appendChild(star);
    }

    submitBtn.disabled = true;
    modal.classList.remove('hidden');
}

function updateStars(container, rating) {
    const stars = container.getElementsByClassName('star');
    for (let i = 0; i < stars.length; i++) {
        if (i < rating) {
            stars[i].classList.add('active');
        } else {
            stars[i].classList.remove('active');
        }
    }
}

async function submitRating() {
    if (!currentPurchaseData) return;

    try {
        const stars = document.querySelectorAll('.star.active').length;
        if (stars === 0) {
            showError('Por favor selecciona una calificación');
            return;
        }

        const confirmResult = await Swal.fire({
            title: 'Confirmar compra',
            html: `
                    <div class="text-left">
                        <p><strong>Item:</strong> ${currentPurchaseData.itemName}</p>
                        <p><strong>Personaje:</strong> ${currentPurchaseData.characterName}</p>
                        <p><strong>Costo:</strong> ${currentPurchaseData.itemCost} tokens</p>
                        <p><strong>Tu calificación:</strong> ${stars}/10</p>
                        <p class="text-yellow-400 mt-2"><i class="fas fa-info-circle mr-2"></i>¿Confirmar compra con esta calificación?</p>
                    </div>
                `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0068caff',
            cancelButtonColor: '#e53e3e',
            confirmButtonText: 'Sí, confirmar compra',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        const response = await axios.post('/api/purchase/confirm', {
            characterGuid: currentPurchaseData.characterGuid,
            itemEntry: currentPurchaseData.itemEntry,
            characterName: currentPurchaseData.characterName,
            rating: stars
        });

        await Swal.fire({
            icon: 'success',
            title: '¡Compra completada!',
            html: `
                    <div class="text-center">
                        <p>¡Compra realizada exitosamente!</p>
                        <p class="text-yellow-400 mt-2">
                            <i class="fas fa-star mr-1"></i>
                            Calificación: ${stars}/10
                        </p>
                        <p class="text-sm text-gray-400 mt-2">
                            Promedio actual del item: ${response.data.averageRating}/10
                        </p>
                        <p class="text-green-400 mt-2">
                            <i class="fas fa-coins mr-1"></i>
                            Nuevo saldo: ${response.data.newBalance} tokens
                        </p>
                    </div>
                `,
            confirmButtonColor: '#0068caff'
        });

        closeRatingModal();

        document.getElementById('user-tokens').textContent = response.data.newBalance;

        if (currentCategory) {
            await loadItemsByCategory(currentCategory);
        }

    } catch (error) {
        console.error('Error confirmando compra:', error);
        showError(error.response?.data?.error || 'Error al confirmar la compra');
    }
}

function closeRatingModal() {
    document.getElementById('rating-modal').classList.add('hidden');
    currentPurchaseData = null;
}

// Obtener tokens del usuario
async function getUserTokens() {
    try {
        const response = await axios.get('/api/items/user/tokens');
        return response.data.tokens || 0;
    } catch (error) {
        console.error('Error obteniendo tokens:', error);
        return 0;
    }
}

// Cerrar sesión
function logout() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Estás seguro de que quieres salir de la tienda?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0068caff',
        cancelButtonColor: '#e53e3e',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/auth/logout';
        }
    });
}

// Mostrar error con SweetAlert
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#0068caff',
    });
}

// ============================================
// FUNCIONALIDAD "MI CUENTA"
// ============================================

// Variables para el modal de cuenta
let accountInfoLoaded = false;

// Mostrar modal Mi Cuenta
async function showAccountModal() {
    try {
        const modal = document.getElementById('account-modal');
        modal.classList.remove('hidden');

        // Solo cargar información si no se ha cargado antes
        if (!accountInfoLoaded) {
            await loadAccountInfo();
            accountInfoLoaded = true;
        }

        // Resetear formulario de cambio de contraseña
        resetPasswordForm();

    } catch (error) {
        console.error('Error mostrando modal de cuenta:', error);
        showError('Error al cargar la información de la cuenta');
    }
}

// Cerrar modal Mi Cuenta
function closeAccountModal() {
    document.getElementById('account-modal').classList.add('hidden');
}

// Cargar información de la cuenta
async function loadAccountInfo() {
    try {
        // Mostrar estado de carga
        setAccountInfoLoading(true);

        const response = await axios.get('/api/account/info');

        if (response.data.success) {
            const account = response.data.account;

            // Actualizar campos de información
            document.getElementById('account-username').textContent = account.username;
            document.getElementById('account-online').textContent = account.online;
            document.getElementById('account-joindate').textContent = account.joindate;
            document.getElementById('account-lastip').textContent = account.last_ip;
            document.getElementById('account-expansion').textContent = account.expansion;
            document.getElementById('account-os').textContent = account.os;
            document.getElementById('account-totaltime').textContent = account.totaltime;
            document.getElementById('account-mutestatus').textContent = account.mutetime;

            // Mostrar detalles de silencio si aplica
            const muteDetails = document.getElementById('account-mute-details');
            if (account.mutetime !== 'No silenciado' && account.mutetime !== 'Silencio expirado') {
                document.getElementById('account-mutereason').textContent = account.mutereason;
                document.getElementById('account-muteby').textContent = account.muteby;
                muteDetails.classList.remove('hidden');
            } else {
                muteDetails.classList.add('hidden');
            }

            setAccountInfoLoading(false);
        } else {
            throw new Error(response.data.error || 'Error al cargar información');
        }

    } catch (error) {
        console.error('Error cargando información de cuenta:', error);

        // Mostrar errores en los campos
        document.getElementById('account-username').textContent = 'Error al cargar';
        document.getElementById('account-online').textContent = 'Error';
        document.getElementById('account-joindate').textContent = 'Error';
        document.getElementById('account-lastip').textContent = 'Error';
        document.getElementById('account-expansion').textContent = 'Error';
        document.getElementById('account-os').textContent = 'Error';
        document.getElementById('account-totaltime').textContent = 'Error';
        document.getElementById('account-mutestatus').textContent = 'Error';

        setAccountInfoLoading(false);
        showError('No se pudo cargar la información de la cuenta: ' + (error.response?.data?.error || error.message));
    }
}

// Establecer estado de carga en la información
function setAccountInfoLoading(isLoading) {
    const fields = [
        'account-username',
        'account-online',
        'account-joindate',
        'account-lastip',
        'account-expansion',
        'account-os',
        'account-totaltime',
        'account-mutestatus'
    ];

    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (isLoading) {
                element.textContent = 'Cargando...';
                element.classList.add('text-gray-400');
            } else {
                element.classList.remove('text-gray-400');
            }
        }
    });
}

// Resetear formulario de cambio de contraseña
function resetPasswordForm() {
    const form = document.getElementById('change-password-form');
    if (form) {
        form.reset();
    }

    // Limpiar errores
    document.getElementById('current-password').classList.remove('error');
    document.getElementById('new-password').classList.remove('error');
    document.getElementById('confirm-password').classList.remove('error');

    document.getElementById('current-password-error').classList.add('hidden');
    document.getElementById('password-match-error').classList.add('hidden');
}

// Configurar evento del formulario de cambio de contraseña
function setupPasswordForm() {
    const form = document.getElementById('change-password-form');

    if (!form) return;

    // Validación en tiempo real de coincidencia de contraseñas
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const matchError = document.getElementById('password-match-error');

    function validatePasswordMatch() {
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (newPass && confirmPass && newPass !== confirmPass) {
            matchError.textContent = 'Las contraseñas no coinciden';
            matchError.classList.remove('hidden');
            confirmPasswordInput.classList.add('error');
            return false;
        } else {
            matchError.classList.add('hidden');
            confirmPasswordInput.classList.remove('error');
            return true;
        }
    }

    newPasswordInput.addEventListener('input', validatePasswordMatch);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);

    // Enviar formulario
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validaciones
        if (!currentPassword) {
            showFieldError('current-password', 'Ingresa tu contraseña actual');
            return;
        }

        if (!newPassword || newPassword.length < 8) {
            showFieldError('new-password', 'La nueva contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (!validatePasswordMatch()) {
            return;
        }

        // Confirmar cambio
        const confirmResult = await Swal.fire({
            title: '¿Cambiar contraseña?',
            html: `
                <div class="text-left">
                    <p><strong>¿Estás seguro de que quieres cambiar tu contraseña?</strong></p>
                    <p class="text-yellow-400 mt-2">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Esta acción:
                    </p>
                    <ul class="list-disc pl-5 mt-2 text-gray-300">
                        <li>Actualizará tu contraseña de logueo.</li>
                        <li>Cerrará tu sesión en todos los dispositivos</li>
                        <li>Te pedirá que inicies sesión nuevamente</li>
                    </ul>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0068caff',
            cancelButtonColor: '#e53e3e',
            confirmButtonText: 'Sí, cambiar contraseña',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        // Enviar solicitud
        try {
            Swal.fire({
                title: 'Cambiando contraseña...',
                html: `
                    <div class="text-center">
                        <div class="loading-spinner mx-auto mb-4"></div>
                        <p>Actualizando contraseña en la tienda y en el juego...</p>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false
            });

            const response = await axios.post('/api/account/change-password', {
                currentPassword: currentPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            });

            Swal.close();

            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Contraseña cambiada!',
                    html: `
                        <div class="text-center">
                            <p>Tu contraseña ha sido cambiada exitosamente.</p>
                            <p class="text-green-400 mt-2">
                                <i class="fas fa-check-circle mr-2"></i>
                                Puedes entrar al juego y la tienda con la contraseña nueva.
                            </p>
                            <p class="text-gray-400 text-sm mt-4">
                                Serás redirigido al login para iniciar sesión con tu nueva contraseña.
                            </p>
                        </div>
                    `,
                    confirmButtonColor: '#0068caff',
                    confirmButtonText: 'Entendido'
                });

                // Cerrar sesión y redirigir al login
                setTimeout(() => {
                    window.location.href = '/auth/logout';
                }, 1000);

            } else {
                throw new Error(response.data.error || 'Error al cambiar contraseña');
            }

        } catch (error) {
            Swal.close();

            console.error('Error cambiando contraseña:', error);

            let errorMessage = error.response?.data?.error || error.message || 'Error desconocido';

            // Manejar errores específicos
            if (errorMessage.includes('contraseña actual es incorrecta')) {
                showFieldError('current-password', 'La contraseña actual es incorrecta');
            } else if (errorMessage.includes('mínimo 8 caracteres')) {
                showFieldError('new-password', 'La contraseña debe tener al menos 8 caracteres');
            } else {
                showError('Error al cambiar contraseña: ' + errorMessage);
            }
        }
    });
}

// Mostrar error en campo específico
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + '-error');

    if (field) {
        field.classList.add('error');
    }

    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

// Limpiar error de campo
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + '-error');

    if (field) {
        field.classList.remove('error');
    }

    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}



// Manejar click en item
function handleItemClick(element) {
    const itemData = getItemDataFromElement(element);
    if (itemData) {
        showSimpleItemDetails(itemData.entry);
    }
}

// Manejar hover en item
function handleItemHover(element, event) {
    const itemData = getItemDataFromElement(element);
    if (itemData) {
        showItemTooltip(event, itemData);
    }
}

// Manejar salida de hover
function handleItemLeave(element) {
    const itemData = getItemDataFromElement(element);
    if (itemData) {
        hideItemTooltip(itemData.entry);
    }
}

// Manejar movimiento del mouse
function handleItemMouseMove(event) {
    updateTooltipPosition(event);
}

// Obtener datos del item desde el elemento
function getItemDataFromElement(element) {
    try {
        const itemDataJson = element.getAttribute('data-item');
        if (!itemDataJson) return null;
        
        // Decodificar el JSON
        const decodedJson = itemDataJson
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
            
        return JSON.parse(decodedJson);
    } catch (error) {
        console.error('Error obteniendo datos del item:', error);
        return null;
    }
}

// Mostrar tooltip (VERSIÓN CON OBJETO)
function showItemTooltip(event, itemData) {
    // Solo mostrar si hay imagen de tooltip
    if (!itemData.tooltip || itemData.tooltip === '') return;
    
    currentHoveredItem = itemData.entry;
    
    // Limpiar timeout anterior
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    
    tooltipTimeout = setTimeout(() => {
        if (currentHoveredItem !== itemData.entry) return;
        
        // Crear o obtener el tooltip flotante
        let tooltip = document.getElementById('floating-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'floating-tooltip';
            tooltip.className = 'floating-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Cargar imagen del tooltip
        const tooltipUrl = `/tooltips/${itemData.tooltip}`;
        
        // Mostrar placeholder mientras carga
        tooltip.innerHTML = `
            <div style="width: 200px; height: 100px; background: rgba(26,26,26,0.9); 
                        border-radius: 8px; display: flex; align-items: center; 
                        justify-content: center;">
                <div class="loading-spinner" style="width: 30px; height: 30px;"></div>
            </div>
        `;
        tooltip.classList.add('visible');
        updateTooltipPosition(event);
        
        // Pre-cargar imagen
        const img = new Image();
        img.onload = function() {
            if (currentHoveredItem === itemData.entry) {
                tooltip.innerHTML = `
                    <img src="${tooltipUrl}" 
                         alt="Tooltip de ${escapeString(itemData.name)}" 
                         onerror="this.style.display='none'"
                         style="max-width: 350px; max-height: 400px;">
                `;
                updateTooltipPosition(event);
            }
        };
        img.onerror = function() {
            if (currentHoveredItem === itemData.entry) {
                tooltip.innerHTML = `
                    <div class="bg-gray-800 border border-red-500 rounded-lg p-4" 
                         style="max-width: 250px;">
                        <p class="text-white text-sm">Tooltip no disponible</p>
                    </div>
                `;
                updateTooltipPosition(event);
            }
        };
        img.src = tooltipUrl;
        
    }, 150);
}