// CLASES
const map_classes_male = new Map([
    [1, "Guerrero"], [2, "Paladín"], [3, "Cazador"], [4, "Pícaro"],
    [5, "Sacerdote"], [6, "Caballero de la muerte"], [7, "Chamán"],
    [8, "Mago"], [9, "Brujo"], [11, "Druida"]
]);

const map_classes_female = new Map([
    [1, "Guerrera"], [2, "Paladín"], [3, "Cazadora"], [4, "Pícara"],
    [5, "Sacerdotisa"], [6, "Caballero de la muerte"], [7, "Chamán"],
    [8, "Maga"], [9, "Bruja"], [11, "Druida"]
]);

// RAZAS
const map_races_male = new Map([
    [1, "Humano"], [2, "Orco"], [3, "Enano"], [4, "Elfo de la noche"],
    [5, "No-muerto"], [6, "Tauren"], [7, "Gnomo"], [8, "Trol"],
    [10, "Elfo de sangre"], [11, "Draenei"]
]);

const map_races_female = new Map([
    [1, "Humana"], [2, "Orco"], [3, "Enana"], [4, "Elfa de la noche"],
    [5, "No-muerta"], [6, "Tauren"], [7, "Gnoma"], [8, "Trol"],
    [10, "Elfa de sangre"], [11, "Draenei"]
]);

function getClassString(gender, player_class) {
    const map = gender === 0 ? map_classes_male : map_classes_female;
    return map.get(player_class) || `Clase ${player_class}`;
}

function getRaceString(gender, player_race) {
    const map = gender === 0 ? map_races_male : map_races_female;
    return map.get(player_race) || `Raza ${player_race}`;
}

class ServicesApp {
    constructor() {
        this.currentService = null;
        this.selectedCharacter = null;
        this.userCharacters = [];
        this.userTokens = 0;
        this.allServices = [];

        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
    }

    async loadUserData() {
        try {
            const response = await axios.get('/api/user');
            document.getElementById('username').textContent = response.data.username;

            await this.checkAdminStatus();
            await this.loadUserTokens();
            await this.loadCategories();
            await this.loadAllServices();
        } catch (error) {
            console.error('Error cargando datos:', error);
            window.location.href = '/auth/login';
        }
    }

    async checkAdminStatus() {
        try {
            const response = await axios.get('/api/admin/check');
            if (response.data.isAdmin) {
                document.getElementById('admin-button-container').classList.remove('hidden');
            }
        } catch (error) {
            // Error silencioso si no es admin o no existe el endpoint
        }
    }

    async loadUserTokens() {
        try {
            const response = await axios.get('/api/items/user/tokens');
            this.userTokens = response.data.tokens || 0;
            document.getElementById('user-tokens').textContent = this.userTokens;
        } catch (error) {
            console.error('Error cargando tokens:', error);
            this.userTokens = 0;
        }
    }

    async loadCategories() {
        try {
            const response = await axios.get('/api/services/categories');
            const categoriesNav = document.getElementById('categories-nav');
            categoriesNav.innerHTML = '';

            const allBtn = this.createCategoryButton('all', 'Todos', 'fa-globe', true);
            categoriesNav.appendChild(allBtn);

            response.data.categories.forEach(category => {
                const btn = this.createCategoryButton(category, category, 'fa-tag', false);
                categoriesNav.appendChild(btn);
            });

            this.selectCategory('all');
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.showError('Error al cargar categorías');
        }
    }

    createCategoryButton(categoryId, label, icon, isActive) {
        const btn = document.createElement('button');
        btn.className = `category-btn ${isActive ? 'active' : ''}`;
        btn.innerHTML = `<i class="fas ${icon} mr-2"></i>${label}`;
        btn.onclick = () => this.selectCategory(categoryId);
        return btn;
    }

    async loadAllServices() {
        try {
            const response = await axios.get('/api/services/all');
            this.allServices = response.data.services || [];
        } catch (error) {
            console.error('Error cargando todos los servicios:', error);
        }
    }

    async selectCategory(categoryId) {
        this.updateActiveCategoryButtons(categoryId);
        this.updateCategoryTitle(categoryId);
        this.showLoading();

        try {
            let services;
            if (categoryId === 'all') {
                services = this.allServices;
            } else {
                const response = await axios.get(`/api/services/by-category/${categoryId}`);
                services = response.data.services;
            }

            this.displayServices(services);
        } catch (error) {
            console.error('Error cargando servicios:', error);
            this.showError('Error al cargar servicios');
        } finally {
            this.hideLoading();
        }
    }

    updateActiveCategoryButtons(categoryId) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            const btnText = btn.textContent.trim();
            if (categoryId === 'all' && btnText.includes('Todos')) {
                btn.classList.add('active');
            } else if (btnText === categoryId) {
                btn.classList.add('active');
            }
        });
    }

    updateCategoryTitle(categoryId) {
        const title = document.getElementById('current-category-title');
        title.innerHTML = categoryId === 'all' 
            ? '<i class="fas fa-concierge-bell mr-3"></i>TODOS LOS SERVICIOS' 
            : `<i class="fas fa-concierge-bell mr-3"></i>SERVICIOS: ${categoryId.toUpperCase()}`;
    }

    showLoading() {
        document.getElementById('services-loading').classList.remove('hidden');
        document.getElementById('no-services-message').classList.add('hidden');
        document.getElementById('services-grid').innerHTML = '';
    }

    hideLoading() {
        document.getElementById('services-loading').classList.add('hidden');
    }

    displayServices(services) {
        const grid = document.getElementById('services-grid');
        if (!services || services.length === 0) {
            document.getElementById('no-services-message').classList.remove('hidden');
            return;
        }
        grid.innerHTML = '';
        services.forEach(service => {
            const card = this.createServiceCard(service);
            grid.appendChild(card);
        });
    }

    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card rounded-xl p-6 cursor-pointer';
        card.addEventListener('click', () => this.openServiceModal(service));

        const borderClass = this.getServiceBorderClass(service.service_type);
        card.classList.add(borderClass);

        const typeBadge = this.getServiceTypeBadge(service.service_type);
        const categoryBadge = service.category ? `<span class="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">${service.category}</span>` : '';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="${typeBadge.class} service-type-badge">
                        <i class="fas ${typeBadge.icon} mr-1"></i> ${typeBadge.text}
                    </span>
                    ${categoryBadge}
                </div>
                <div class="text-right">
                    <div class="token-display inline-flex items-center px-3 py-1">
                        <i class="fas fa-coins text-yellow-400 mr-1"></i>
                        <span class="font-bold">${service.token_cost}</span>
                    </div>
                </div>
            </div>
            <h3 class="text-xl font-bold text-white mb-3">${service.name}</h3>
            <p class="text-gray-300 text-sm mb-4 line-clamp-2">${service.description || 'Sin descripción'}</p>
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-400">
                    <i class="fas fa-shopping-cart mr-1"></i> Comprado ${service.times || 0} veces
                </div>
                <span class="text-white font-bold flex items-center">
                    Ver detalles <i class="fas fa-chevron-right ml-2"></i>
                </span>
            </div>
        `;
        return card;
    }

    getServiceBorderClass(serviceType) {
        const borderClasses = {
            'level_up': 'border-success',
            'gold': 'border-gold',
            'xp_boost': 'border-purple-500',
            'rename': 'border-service',
            'customize': 'border-service',
            'faction_change': 'border-service',
            'race_change': 'border-service',
            'unstuck': 'border-service'
        };
        return borderClasses[serviceType] || 'border-service';
    }

    getServiceTypeBadge(type) {
        const badges = {
            'level_up': { class: 'badge-level', text: 'Nivel', icon: 'fa-level-up-alt' },
            'gold': { class: 'badge-gold', text: 'Oro', icon: 'fa-coins' },
            'xp_boost': { class: 'badge-account', text: 'XP Boost', icon: 'fa-rocket' }, // ICONO COHETE PARA XP
            'rename': { class: 'badge-account', text: 'Nombre', icon: 'fa-signature' },
            'customize': { class: 'badge-character', text: 'Apariencia', icon: 'fa-user-edit' },
            'faction_change': { class: 'badge-account', text: 'Facción', icon: 'fa-flag' },
            'race_change': { class: 'badge-character', text: 'Raza', icon: 'fa-users' },
            'unstuck': { class: 'badge-success', text: 'Utilidad', icon: 'fa-life-ring' }
        };
        return badges[type] || { class: 'badge-account', text: 'Servicio', icon: 'fa-cog' };
    }

    openServiceModal(service) {
        this.currentService = { ...service };
        const modal = document.getElementById('service-detail-modal');
        if (!modal) return;

        this.populateServiceModal(this.currentService);
        modal.classList.remove('hidden');

        document.getElementById('service-modal-buy-btn').onclick = () => this.openCharacterSelect();
    }

    populateServiceModal(service) {
        document.getElementById('service-modal-title').textContent = service.name;
        document.getElementById('service-modal-price').textContent = service.token_cost;
        document.getElementById('service-modal-description').textContent = service.description || 'Sin descripción disponible.';
        this.populateServiceBadges(service);
    }

    populateServiceBadges(service) {
        const badgesContainer = document.getElementById('service-modal-badges');
        badgesContainer.innerHTML = '';
        const typeBadge = this.getServiceTypeBadge(service.service_type);
        const typeBadgeEl = document.createElement('span');
        typeBadgeEl.className = `${typeBadge.class} service-type-badge`;
        typeBadgeEl.innerHTML = `<i class="fas ${typeBadge.icon} mr-1"></i>${typeBadge.text}`;
        badgesContainer.appendChild(typeBadgeEl);

        if (service.category) {
            const categoryBadge = document.createElement('span');
            categoryBadge.className = 'service-type-badge bg-gray-700 text-white';
            categoryBadge.innerHTML = `<i class="fas fa-tag mr-1"></i>${service.category}`;
            badgesContainer.appendChild(categoryBadge);
        }
    }

    closeServiceModal() {
        document.getElementById('service-detail-modal').classList.add('hidden');
    }

    async openCharacterSelect() {
        if (!this.currentService) return;
        this.closeServiceModal();
        const modal = document.getElementById('character-select-modal');
        document.getElementById('character-select-service').textContent = `Servicio: ${this.currentService.name} - ${this.currentService.token_cost} Tokens`;
        await this.loadCharacters();
        modal.classList.remove('hidden');
    }

    async loadCharacters() {
        const characterList = document.getElementById('character-list');
        characterList.innerHTML = '<div class="loading-message"><div class="loading-spinner"></div><p>Cargando personajes...</p></div>';
        try {
            const response = await axios.get('/api/services/characters');
            this.userCharacters = response.data.characters || [];
            if (this.userCharacters.length === 0) {
                characterList.innerHTML = '';
                document.getElementById('no-characters-message').classList.remove('hidden');
                return;
            }
            this.displayCharacters(this.userCharacters);
        } catch (error) {
            this.showError('Error al cargar personajes');
        }
    }

    displayCharacters(characters) {
        const characterList = document.getElementById('character-list');
        characterList.innerHTML = '';
        characters.forEach(character => {
            const charDiv = document.createElement('div');
            charDiv.className = 'character-option';
            charDiv.onclick = (e) => this.selectCharacter(character, e);

            const isOnline = character.online === 1;
            const goldAmount = Math.floor(character.money / 10000);
            const gender = character.gender || 0;
            const raceName = getRaceString(gender, character.race);
            const className = getClassString(gender, character.class);

            charDiv.innerHTML = `
                <div class="character-info">
                    <div class="character-details">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-white font-bold">${character.name}</span>
                                <span class="character-level">${character.level}</span>
                            </div>
                            <div class="text-sm text-gray-400">${raceName} ${className}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="${isOnline ? 'character-online' : 'character-offline'}">
                            <i class="fas fa-circle mr-1"></i> ${isOnline ? 'Online' : 'Offline'}
                        </div>
                        <div class="text-xs text-gray-400 mt-1">Oro: ${goldAmount}g</div>
                    </div>
                </div>`;
            characterList.appendChild(charDiv);
        });
    }

    selectCharacter(character, event) {
        this.selectedCharacter = character;
        document.querySelectorAll('.character-option').forEach(opt => opt.classList.remove('selected'));
        event.currentTarget.classList.add('selected');

        const confirmBtn = document.getElementById('confirm-purchase-btn');
        confirmBtn.disabled = false;
        if (character.online === 1) {
            confirmBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Personaje ONLINE - No recomendado';
            confirmBtn.className = 'btn-service flex-1 bg-gradient-to-r from-yellow-600 to-orange-600';
        } else {
            confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Confirmar Compra';
            confirmBtn.className = 'btn-success flex-1';
        }
    }

    closeCharacterSelect() {
        document.getElementById('character-select-modal').classList.add('hidden');
        this.selectedCharacter = null;
        document.getElementById('confirm-purchase-btn').disabled = true;
    }

    async confirmServicePurchase() {
        if (!this.currentService || !this.selectedCharacter) {
            this.showError('Selecciona un personaje primero');
            return;
        }
        if (this.userTokens < this.currentService.token_cost) {
            this.showError('Tokens insuficientes');
            return;
        }
        if (this.selectedCharacter.online === 1) {
            const confirm = await this.showOnlineWarning();
            if (!confirm) return;
        }
        await this.processServicePurchase();
    }

    async showOnlineWarning() {
        const result = await Swal.fire({
            title: '¡Personaje ONLINE!',
            html: `<p>El personaje <strong>${this.selectedCharacter.name}</strong> está ONLINE. Se recomienda desconectar para evitar errores.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        });
        return result.isConfirmed;
    }

    async processServicePurchase() {
        try {
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            // Validar
            await axios.post('/api/services/validate', {
                characterGuid: this.selectedCharacter.guid,
                serviceId: this.currentService.id
            });

            // Comprar
            const purchase = await axios.post('/api/services/purchase', {
                characterGuid: this.selectedCharacter.guid,
                serviceId: this.currentService.id,
                characterName: this.selectedCharacter.name
            });

            if (purchase.data.success) {
                await this.showPurchaseSuccess(purchase.data);
                this.handlePurchaseSuccess(purchase.data);
            }
        } catch (error) {
            this.showError(error.response?.data?.error || 'Error al procesar la compra');
        }
    }

    async showPurchaseSuccess(purchaseData) {
        await Swal.fire({
            title: '¡Servicio Aplicado!',
            html: `<p><strong>${this.currentService.name}</strong> aplicado a <strong>${this.selectedCharacter.name}</strong>.</p>
                   <p class="text-green-300">Nuevo balance: ${purchaseData.newBalance} Tokens</p>`,
            icon: 'success'
        });
    }

    handlePurchaseSuccess(purchaseData) {
        this.userTokens = purchaseData.newBalance;
        document.getElementById('user-tokens').textContent = this.userTokens;
        this.closeCharacterSelect();
        this.refreshServices();
    }

    async refreshServices() {
        await this.loadAllServices();
        const activeBtn = document.querySelector('.category-btn.active');
        this.selectCategory(activeBtn.textContent.trim().includes('Todos') ? 'all' : activeBtn.textContent.trim());
    }

    showError(message) {
        Swal.fire({ title: 'Error', text: message, icon: 'error' });
    }

    async logout() {
        await axios.post('/auth/logout');
        window.location.href = '/auth/login';
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.closest('#service-modal-buy-btn')) this.openCharacterSelect();
            if (target.closest('#confirm-purchase-btn')) this.confirmServicePurchase();
            if (target.closest('.close-service-modal')) this.closeServiceModal();
            if (target.closest('.close-character-modal')) this.closeCharacterSelect();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.servicesApp = new ServicesApp(); });