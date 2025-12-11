import database from '../config/database.js';

const { worldPool } = database;

class ItemService {

    // Obtener datos completos del item (incluyendo procesamiento de stats)
    static async getItemData(itemEntry) {
        try {
            // console.log(`[ItemService] Obteniendo datos desde BD para item: ${itemEntry}`);

            // Obtener datos técnicos de item_template
            const [items] = await worldPool.execute(`
                SELECT 
                    it.entry,
                    it.name,
                    it.Quality,
                    it.ItemLevel,
                    it.displayid,
                    it.RequiredLevel,
                    it.armor,
                    it.dmg_min1,
                    it.dmg_max1,
                    it.dmg_type1,
                    it.delay,
                    it.MaxDurability,
                    it.description as technical_description,
                    it.class,
                    it.subclass,
                    it.InventoryType,
                    it.ContainerSlots,
                    it.bonding,
                    -- Stats 1-10
                    it.stat_type1, it.stat_value1,
                    it.stat_type2, it.stat_value2,
                    it.stat_type3, it.stat_value3,
                    it.stat_type4, it.stat_value4,
                    it.stat_type5, it.stat_value5,
                    it.stat_type6, it.stat_value6,
                    it.stat_type7, it.stat_value7,
                    it.stat_type8, it.stat_value8,
                    it.stat_type9, it.stat_value9,
                    it.stat_type10, it.stat_value10,
                    -- Resistencias
                    it.holy_res, it.fire_res, it.nature_res, 
                    it.frost_res, it.shadow_res, it.arcane_res
                FROM item_template it
                WHERE it.entry = ?
            `, [itemEntry]);

            if (items.length === 0) {
                return { success: false, error: 'Item no encontrado' };
            }

            // Obtener nombre, descripción Y is_heroic de aa_store_items
            const [storeItems] = await worldPool.execute(
                'SELECT name, description, is_heroic FROM aa_store_items WHERE entry = ?',
                [itemEntry]
            );

            const item = items[0];

            // SIEMPRE usar aa_store_items si existe, sino item_template
            const finalName = storeItems.length > 0 ? storeItems[0].name : item.name;
            const finalDescription = storeItems.length > 0 ? storeItems[0].description : item.technical_description;
            // Usar is_heroic de la tabla aa_store_items (default 0 si no existe)
            const isHeroic = storeItems.length > 0 ? (storeItems[0].is_heroic === 1) : false;

            const processedData = this.processItemData(item, finalDescription, finalName);
            
            // Agregar isHeroic desde la base de datos
            processedData.isHeroic = isHeroic;
            
            // Eliminar tooltip ya que no es necesario (opcional, puedes mantenerlo si lo usas para otra cosa)
            processedData.tooltip = null;

            //console.log(`[ItemService] Datos obtenidos. ¿Es Heroic?: ${isHeroic} (desde BD)`);

            return {
                success: true,
                ...processedData
            };

        } catch (error) {
            //console.error('[ItemService] Error en getItemData:', error);
            return { success: false, error: 'Error interno del servidor' };
        }
    }

    // Procesar y formatear los datos del item para el frontend
    static processItemData(item, description, spanishName) {
        // console.log(`[ItemService] Procesando datos del item: ${item.entry}`);

        const stats = this.processStats(item);
        const resistances = this.processResistances(item);

        // console.log(`[ItemService] Stats procesados:`, stats);
        // console.log(`[ItemService] Resistencias procesadas:`, resistances);

        const result = {
            itemEntry: item.entry,
            name: spanishName,  // ← Usar el nombre en español
            quality: item.Quality,
            itemLevel: item.ItemLevel,
            requiredLevel: item.RequiredLevel,
            displayId: item.displayid,
            armor: item.armor || 0,
            damage: item.dmg_min1 > 0 ? {
                min: item.dmg_min1,
                max: item.dmg_max1,
                type: this.getDamageType(item.dmg_type1)
            } : null,
            delay: item.delay || 2000,
            durability: item.MaxDurability || 0,
            description: description,
            class: item.class,
            subclass: item.subclass,
            inventoryType: item.InventoryType,
            containerSlots: item.ContainerSlots || 0,
            bonding: item.bonding || 0,
            stats: stats,
            resistances: resistances
        };

        // console.log(`[ItemService] Datos finales procesados:`, result);
        return result;
    }

    // Procesar los stats del item con nombres formateados
    static processStats(item) {
        const stats = [];

        for (let i = 1; i <= 10; i++) {
            const statType = item[`stat_type${i}`];
            const statValue = item[`stat_value${i}`];

            if (statType > 0 && statValue !== 0) {
                stats.push({
                    type: statType,
                    value: statValue
                });
            }
        }

        // console.log(`[ItemService] Stats extraídos: ${stats.length} stats válidos`);
        return stats;
    }

    // Procesar resistencias
    static processResistances(item) {
        const resistances = [];
        const resTypes = [
            { key: 'holy_res', name: 'Sagrada' },
            { key: 'fire_res', name: 'Fuego' },
            { key: 'nature_res', name: 'Naturaleza' },
            { key: 'frost_res', name: 'Escarcha' },
            { key: 'shadow_res', name: 'Oscura' },
            { key: 'arcane_res', name: 'Arcano' }
        ];

        resTypes.forEach(res => {
            if (item[res.key] > 0) {
                resistances.push({
                    type: res.name,
                    value: item[res.key]
                });
            }
        });

        // console.log(`[ItemService] Resistencias extraídas: ${resistances.length} resistencias válidas`);
        return resistances;
    }

    // Mapear tipos de daño
    static getDamageType(damageType) {
        const types = {
            1: 'Físico',
            2: 'Sagrado',
            3: 'Fuego',
            4: 'Naturaleza',
            5: 'Escarcha',
            6: 'Oscuro',
            7: 'Arcano'
        };
        return types[damageType] || 'Físico';
    }

}

export default ItemService;