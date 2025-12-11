import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IconService {
    constructor() {
        // Ruta donde se guardarán los iconos
        this.iconsDir = path.join(__dirname, '../public/icon_images');

        // Asegurar que existe el directorio
        if (!fs.existsSync(this.iconsDir)) {
            fs.mkdirSync(this.iconsDir, { recursive: true });
        }

        // Cache en memoria para evitar búsquedas repetidas en disco
        this.iconCache = new Map();

        // Icono por defecto
        this.defaultIconName = 'inv_misc_questionmark.jpg';
        this.defaultIconPath = path.join(this.iconsDir, this.defaultIconName);

        // Cargar iconos existentes y asegurar icono por defecto
        this.initializeIcons();
    }

    /**
     * Inicializa iconos: carga existentes y asegura icono por defecto
     */
    async initializeIcons() {
        try {
            // Cargar iconos existentes en caché
            this.loadExistingIcons();

            // Asegurar que el icono por defecto existe
            await this.ensureDefaultIcon();

        } catch (error) {
            //console.error('Error inicializando iconos:', error.message);
        }
    }

    /**
     * Asegura que el icono por defecto exista
     */
    async ensureDefaultIcon() {
        if (fs.existsSync(this.defaultIconPath)) {
            //console.log(`Icono por defecto ya existe: ${this.defaultIconName}`);
            return true;
        }

        try {
            //console.log(`Descargando icono por defecto: ${this.defaultIconName}`);
            const iconUrl = `https://wotlkdb.com/static/images/wow/icons/large/${this.defaultIconName}`;

            const response = await axios({
                method: 'GET',
                url: iconUrl,
                responseType: 'stream',
                timeout: 15000
            });

            const writer = fs.createWriteStream(this.defaultIconPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    //console.log(`Icono por defecto descargado: ${this.defaultIconName}`);
                    resolve(true);
                });
                writer.on('error', (err) => {
                    //console.error(`Error descargando icono por defecto:`, err.message);
                    reject(err);
                });
            });

        } catch (error) {
            //console.error(`No se pudo descargar icono por defecto:`, error.message);

            // Si no se puede descargar, crear un archivo vacío como fallback
            fs.writeFileSync(this.defaultIconPath, '');
            //console.log(`Creado archivo vacío como icono por defecto`);
            return false;
        }
    }

    /**
     * Carga todos los iconos existentes en memoria al iniciar
     */
    loadExistingIcons() {
        try {
            if (fs.existsSync(this.iconsDir)) {
                const files = fs.readdirSync(this.iconsDir);
                let loadedCount = 0;

                files.forEach(file => {
                    // Extraer itemId del nombre si es posible (ej: 50730_inv_sword_153.jpg)
                    const match = file.match(/^(\d+)_(.+\.jpg)$/);
                    if (match) {
                        const itemId = parseInt(match[1]);
                        const iconName = match[2];
                        this.iconCache.set(itemId, iconName);
                        loadedCount++;
                    }
                });

                //console.log(`Cargados ${loadedCount} iconos en caché`);

                // Agregar icono por defecto al caché con ID 0
                if (fs.existsSync(this.defaultIconPath)) {
                    this.iconCache.set(0, this.defaultIconName);
                }
            }
        } catch (error) {
            //console.error('Error cargando iconos existentes:', error.message);
        }
    }

    /**
     * Busca un icono localmente por itemId
     * @param {number} itemId - ID del item
     * @returns {string|null} - Nombre del icono si existe
     */
    findIconLocally(itemId) {
        // 1. Verificar en caché de memoria
        if (this.iconCache.has(itemId)) {
            const iconName = this.iconCache.get(itemId);
            const iconPath = path.join(this.iconsDir, `${itemId}_${iconName}`);

            if (fs.existsSync(iconPath)) {
                //console.log(`Icono encontrado en caché para item ${itemId}: ${iconName}`);
                return iconName;
            } else {
                // Limpiar caché si el archivo no existe
                this.iconCache.delete(itemId);
            }
        }

        // 2. Buscar en el sistema de archivos
        try {
            const files = fs.readdirSync(this.iconsDir);

            // Buscar archivos que comiencen con el itemId
            for (const file of files) {
                if (file.startsWith(`${itemId}_`) && file.endsWith('.jpg')) {
                    const iconName = file.substring(itemId.toString().length + 1); // +1 por el guión bajo

                    // Actualizar caché
                    this.iconCache.set(itemId, iconName);
                    //console.log(`Icono encontrado en disco para item ${itemId}: ${iconName}`);
                    return iconName;
                }
            }

            // 3. Buscar por nombre genérico (compatibilidad con versiones anteriores)
            for (const file of files) {
                if (file.includes(`_${itemId}.`) || file.includes(`${itemId}_`)) {
                    //console.log(`Icono encontrado (compatibilidad) para item ${itemId}: ${file}`);
                    return file.replace(`${itemId}_`, '').replace(/^\d+_/, '');
                }
            }

            return null;
        } catch (error) {
            //console.error(`Error buscando icono local para item ${itemId}:`, error.message);
            return null;
        }
    }

    /**
     * Extrae el nombre del icono de wotlkdb.com
     * @param {number} itemId - ID del item
     * @returns {Promise<string|null>} - Nombre del archivo del icono o null
     */
    async extractIconNameFromWotlkDB(itemId) {
        try {
            const url = `https://wotlkdb.com/?item=${itemId}`;
            //console.log(`🌐 [IconService] Extrayendo icono para item ${itemId} desde: ${url}`);

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const html = response.data;

            //console.log(`🔍 [IconService] Buscando datos JSON en JavaScript...`);

            // Patrón 1: Buscar g_items[{itemId}] = { ... "icon":"..." ... }
            const pattern1 = new RegExp(`_\\[${itemId}\\]\\s*=\\s*{([^}]+"icon":"([^"]+)")`);
            const match1 = html.match(pattern1);

            if (match1 && match1[2]) {
                const iconName = `${match1[2]}.jpg`; // Agregar extensión .jpg
                //console.log(`[IconService] Icono encontrado en JSON: ${iconName}`);
                return iconName;
            }

            // Patrón 2: Buscar cualquier referencia al itemId con icon
            const pattern2 = new RegExp(`"icon":"([^"]+)".*?${itemId}`);
            const match2 = html.match(pattern2);

            if (match2 && match2[1]) {
                const iconName = `${match2[1]}.jpg`;
                //console.log(`[IconService] Icono encontrado (patrón 2): ${iconName}`);
                return iconName;
            }

            // Patrón 3: Buscar en el objeto g_items
            const gItemsPattern = /g_items\s*=\s*{([^}]+)}/;
            const gItemsMatch = html.match(gItemsPattern);

            if (gItemsMatch) {
                // Buscar específicamente nuestro itemId
                const itemPattern = new RegExp(`${itemId}\\s*:\\s*{([^}]+)}`);
                const itemMatch = gItemsMatch[1].match(itemPattern);

                if (itemMatch) {
                    const iconPattern = /"icon":"([^"]+)"/;
                    const iconMatch = itemMatch[1].match(iconPattern);

                    if (iconMatch && iconMatch[1]) {
                        const iconName = `${iconMatch[1]}.jpg`;
                        //console.log(`[IconService] Icono encontrado en g_items: ${iconName}`);
                        return iconName;
                    }
                }
            }

            // Patrón 4: Buscar cualquier "inv_" cerca del itemId
            const invPattern = new RegExp(`${itemId}[^}]*"icon":"(inv_[^"]+)"`);
            const invMatch = html.match(invPattern);

            if (invMatch && invMatch[1]) {
                const iconName = `${invMatch[1]}.jpg`;
                //console.log(`[IconService] Icono encontrado (patrón inv): ${iconName}`);
                return iconName;
            }

            //console.log(`[IconService] No se pudo encontrar icono en el JavaScript`);

            // DEBUG: Mostrar sección relevante del HTML
            const startIndex = html.indexOf(`[${itemId}]`);
            if (startIndex !== -1) {
                const snippet = html.substring(startIndex, startIndex + 500);
                //console.log(`🔧 [IconService] Snippet alrededor de [${itemId}]:`, snippet);
            }

            return this.defaultIconName;

        } catch (error) {
            //console.error(`[IconService] Error extrayendo icono para item ${itemId}:`, error.message);

            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                //console.log(`🌐 [IconService] Error de conexión a wotlkdb.com`);
            } else if (error.response) {
                //console.log(`🌐 [IconService] HTTP ${error.response.status}: ${error.response.statusText}`);
            }

            return this.defaultIconName;
        }
    }

    /**
     * Descarga y guarda un icono
     * @param {number} itemId - ID del item
     * @param {string} iconName - Nombre del archivo del icono
     * @returns {Promise<boolean>} - true si se descargó o ya existe
     */
    async downloadIcon(itemId, iconName) {
        // Si es el icono por defecto, usar nombre simple
        if (iconName === this.defaultIconName) {
            const iconPath = path.join(this.iconsDir, iconName);

            if (fs.existsSync(iconPath)) {
                return true;
            }

            // Intentar descargar de nuevo
            return await this.ensureDefaultIcon();
        }

        const fileName = `${itemId}_${iconName}`;
        const iconPath = path.join(this.iconsDir, fileName);

        // Si ya existe, no descargar de nuevo
        if (fs.existsSync(iconPath)) {
            //console.log(`Icono ${fileName} ya existe localmente`);
            this.iconCache.set(itemId, iconName); // Actualizar caché
            return true;
        }

        try {
            const iconUrl = `https://wotlkdb.com/static/images/wow/icons/large/${iconName.replace('.jpg', '')}.jpg`;
            //console.log(`Descargando icono: ${iconUrl}`);

            const response = await axios({
                method: 'GET',
                url: iconUrl,
                responseType: 'stream',
                timeout: 15000
            });

            // Guardar el archivo con prefijo de itemId
            const writer = fs.createWriteStream(iconPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    //console.log(`Icono descargado: ${fileName}`);
                    this.iconCache.set(itemId, iconName); // Actualizar caché
                    resolve(true);
                });
                writer.on('error', (err) => {
                    //console.error(`Error guardando icono ${fileName}:`, err.message);
                    // Intentar eliminar archivo corrupto
                    if (fs.existsSync(iconPath)) {
                        fs.unlinkSync(iconPath);
                    }
                    reject(err);
                });
            });

        } catch (error) {
            //console.error(`Error descargando icono ${iconName}:`, error.message);

            // Si falla la descarga, usar icono por defecto
            //console.log(`Usando icono por defecto para item ${itemId}`);

            // Si el icono por defecto no existe, asegurarlo
            if (!fs.existsSync(this.defaultIconPath)) {
                await this.ensureDefaultIcon();
            }

            // Guardar referencia al icono por defecto
            this.iconCache.set(itemId, this.defaultIconName);
            return false;
        }
    }

    /**
     * Procesa un item: extrae y descarga su icono si es necesario
     * @param {number} itemId - ID del item
     * @param {string} itemName - Nombre del item (para logging)
     * @returns {Promise<string|null>} - Nombre del icono o null
     */
    async processItemIcon(itemId, itemName = '') {
        try {
            //console.log(`🔍 [IconService] Procesando icono para item ${itemId}: "${itemName}"`);

            // 1. BUSCAR LOCALMENTE PRIMERO
            const localIcon = this.findIconLocally(itemId);
            if (localIcon) {
                //console.log(`✅ [IconService] Icono encontrado localmente: ${localIcon}`);
                return localIcon;
            }

            //console.log(`[IconService] Icono no encontrado localmente, consultando wotlkdb.com...`);

            // 2. Extraer de wotlkdb.com
            const iconName = await this.extractIconNameFromWotlkDB(itemId);

            //console.log(`[IconService] Icono extraído: ${iconName}`);

            if (!iconName || iconName === this.defaultIconName) {
                //console.log(`[IconService] Usando icono por defecto para item ${itemId}`);
                return this.defaultIconName;
            }

            // 3. Descargar icono
            //console.log(`⬇[IconService] Descargando icono: ${iconName}`);
            const downloaded = await this.downloadIcon(itemId, iconName);

            if (!downloaded) {
                //console.log(`[IconService] Falló descarga, usando icono por defecto`);
                return this.defaultIconName;
            }

            //console.log(`[IconService] Icono procesado exitosamente: ${iconName}`);
            return iconName;

        } catch (error) {
            //console.error(`[IconService] Error procesando icono para item ${itemId}:`, error.message);
            return this.defaultIconName;
        }
    }

    /**
     * Obtiene la URL pública del icono
     * @param {number} itemId - ID del item
     * @param {string} iconName - Nombre del archivo del icono (de la BD)
     * @returns {string} - URL completa del icono
     */
    getIconUrl(itemId, iconName = null) {
        // Si es el icono por defecto, devolver sin prefijo
        if (iconName === this.defaultIconName || !iconName) {
            return `/icons/${this.defaultIconName}`;
        }

        // Buscar localmente primero
        const localIcon = this.findIconLocally(itemId);
        if (localIcon) {
            return `/icons/${itemId}_${localIcon}`;
        }

        // Si tenemos el nombre pero no existe localmente
        if (iconName && iconName !== this.defaultIconName) {
            return `/icons/${itemId}_${iconName}`;
        }

        // Último recurso: icono por defecto
        return `/icons/${this.defaultIconName}`;
    }

    /**
     * Verifica si un icono existe localmente
     * @param {number} itemId - ID del item
     * @param {string} iconName - Nombre del icono (opcional)
     * @returns {boolean}
     */
    iconExists(itemId, iconName = null) {
        if (iconName) {
            const iconPath = path.join(this.iconsDir, `${itemId}_${iconName}`);
            return fs.existsSync(iconPath);
        }

        return this.findIconLocally(itemId) !== null;
    }

    /**
     * Obtiene el nombre del icono por defecto
     * @returns {string}
     */
    getDefaultIconName() {
        return this.defaultIconName;
    }

    /**
     * Limpia el caché de iconos
     */
    clearCache() {
        this.iconCache.clear();
        //console.log('Caché de iconos limpiado');
    }
}

// Exportar una instancia única
export default new IconService();