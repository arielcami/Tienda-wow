import database from '../config/database.js';
import iconService from '../services/iconService.js';

const { worldPool, charactersPool } = database;

class ItemModel {

    // Obtener items por categoría
    static async getItemsByCategory(category, limit = 50) {
        try {
            const limitNumber = parseInt(limit);
            const validLimit = isNaN(limitNumber) || limitNumber <= 0 ? 50 : limitNumber;

            const query = `
            SELECT entry, name, icon_name, category, tooltip_image, 
                   token_cost, times, stars, total_ratings
            FROM aa_store_items 
            WHERE estado = 1 AND category = ?
            ORDER BY name
            LIMIT ${validLimit}
        `;

            const [items] = await worldPool.execute(query, [category]);

            const itemsWithIcons = await Promise.all(
                items.map(async (item) => {
                    let iconName = item.icon_name;

                    if (!iconName || iconName.trim() === '' || iconName === 'inv_misc_questionmark.jpg') {
                        iconName = await iconService.processItemIcon(item.entry, item.name);

                        if (iconName && iconName !== 'inv_misc_questionmark.jpg') {
                            await worldPool.execute(
                                'UPDATE aa_store_items SET icon_name = ? WHERE entry = ?',
                                [iconName, item.entry]
                            );
                        }
                    }

                    const iconUrl = iconService.getIconUrl(item.entry, iconName);

                    return {
                        ...item,
                        icon_name: iconName || null,
                        icon_url: iconUrl
                    };
                })
            );

            return itemsWithIcons;

        } catch (error) {
            console.error('Error obteniendo items por categoría:', error);
            return [];
        }
    }

    // Obtener TODOS los items activos
    static async getAllItems(limit = 100) {
        try {
            const limitNumber = parseInt(limit);
            const validLimit = isNaN(limitNumber) || limitNumber <= 0 ? 100 : limitNumber;

            const query = `
            SELECT entry, name, icon_name, category, tooltip_image, 
                   token_cost, times, stars, total_ratings, estado
            FROM aa_store_items 
            WHERE estado = 1
            ORDER BY name
            LIMIT ${validLimit}
        `;

            const [items] = await worldPool.execute(query);

            const itemsWithIcons = await Promise.all(
                items.map(async (item) => {
                    let iconName = item.icon_name;

                    if (!iconName || iconName.trim() === '' || iconName === 'inv_misc_questionmark.jpg') {
                        iconName = await iconService.processItemIcon(item.entry, item.name);

                        if (iconName && iconName !== 'inv_misc_questionmark.jpg') {
                            await worldPool.execute(
                                'UPDATE aa_store_items SET icon_name = ? WHERE entry = ?',
                                [iconName, item.entry]
                            );
                        }
                    }

                    const iconUrl = iconService.getIconUrl(item.entry, iconName);

                    return {
                        entry: item.entry,
                        name: item.name,
                        icon_name: iconName || null,
                        icon_url: iconUrl,
                        category: item.category,
                        tooltip_image: item.tooltip_image,
                        token_cost: item.token_cost,
                        times: item.times,
                        stars: parseFloat(item.stars) || 0,
                        total_ratings: item.total_ratings || 0,
                        estado: item.estado
                    };
                })
            );

            return itemsWithIcons;

        } catch (error) {
            console.error('Error obteniendo todos los items:', error);
            return [];
        }
    }


    // Buscar items por nombre (versión simplificada)
    static async searchItems(searchTerm, page = 1, limit = 20) {
        try {
            const validPage = Math.max(1, parseInt(page) || 1);
            const validLimit = Math.max(1, parseInt(limit) || 20);
            const validSearchTerm = searchTerm || '';
            const offset = (validPage - 1) * validLimit;

            const [items] = await worldPool.execute(
                `SELECT entry, name, icon_name, category, tooltip_image, token_cost, times, stars, total_ratings
                 FROM aa_store_items 
                 WHERE estado = 1 AND name LIKE ?
                 ORDER BY name
                 LIMIT ? OFFSET ?`,
                [
                    `%${validSearchTerm}%`,
                    validLimit.toString(),
                    offset.toString()
                ]
            );

            const [countResult] = await worldPool.execute(
                'SELECT COUNT(*) as total FROM aa_store_items WHERE estado = 1 AND name LIKE ?',
                [`%${validSearchTerm}%`]
            );

            const itemsWithIcons = await Promise.all(
                items.map(async (item) => {
                    let iconName = item.icon_name;

                    if (!iconName || iconName.trim() === '' || iconName === 'inv_misc_questionmark.jpg') {
                        iconName = await iconService.processItemIcon(item.entry, item.name);

                        if (iconName && iconName !== 'inv_misc_questionmark.jpg') {
                            await worldPool.execute(
                                'UPDATE aa_store_items SET icon_name = ? WHERE entry = ?',
                                [iconName, item.entry]
                            );
                        }
                    }

                    const iconUrl = iconService.getIconUrl(item.entry, iconName);

                    return {
                        ...item,
                        icon_name: iconName || null,
                        icon_url: iconUrl
                    };
                })
            );

            return {
                items: itemsWithIcons,
                total: countResult[0].total,
                page: validPage,
                totalPages: Math.ceil(countResult[0].total / validLimit)
            };

        } catch (error) {
            console.error('Error buscando items:', error);
            throw error;
        }
    }

    // Obtener detalles de un item
    static async getItemDetails(entry) {
        try {
            const [items] = await worldPool.execute(
                `SELECT entry, name, icon_name, category, tooltip_image,
                        token_cost, times, stars, total_ratings
                 FROM aa_store_items WHERE entry = ? AND estado = 1`,
                [entry]
            );

            if (items.length === 0) return null;

            const item = items[0];
            let iconName = item.icon_name;

            if (!iconName || iconName.trim() === '' || iconName === 'inv_misc_questionmark.jpg') {
                iconName = await iconService.processItemIcon(item.entry, item.name);

                if (iconName && iconName !== 'inv_misc_questionmark.jpg') {
                    await worldPool.execute(
                        'UPDATE aa_store_items SET icon_name = ? WHERE entry = ?',
                        [iconName, item.entry]
                    );
                }
            }

            const iconUrl = iconService.getIconUrl(item.entry, iconName);

            return {
                ...item,
                icon_name: iconName || null,
                icon_url: iconUrl
            };

        } catch (error) {
            console.error('Error obteniendo detalles del item:', error);
            throw error;
        }
    }

    // Obtener tokens del usuario
    static async getUserTokens(accountId) {
        try {
            const [rows] = await charactersPool.execute(
                'SELECT tokens FROM aa_tienda_tokens WHERE accountId = ?',
                [accountId]
            );
            return rows.length > 0 ? rows[0].tokens : 0;
        } catch (error) {
            console.error('Error obteniendo tokens:', error);
            return 0;
        }
    }

    // Obtener personajes de la cuenta
    static async getCharacters(accountId) {
        try {
            const [characters] = await charactersPool.execute(
                `SELECT guid, name, race, class, level 
                 FROM characters 
                 WHERE account = ? 
                 ORDER BY name`,
                [accountId]
            );
            return characters;
        } catch (error) {
            console.error('Error obteniendo personajes:', error);
            return [];
        }
    }

    // Verificar si el personaje pertenece a la cuenta
    static async verifyCharacterOwnership(accountId, characterGuid) {
        try {
            const [characters] = await charactersPool.execute(
                'SELECT guid, name FROM characters WHERE account = ? AND guid = ?',
                [accountId, characterGuid]
            );

            return characters.length > 0 ? characters[0] : null;
        } catch (error) {
            console.error('Error verificando propiedad del personaje:', error);
            return null;
        }
    }

    // Obtener compras pendientes de calificación
    static async getPendingRatings(accountId, characterGuid = null) {
        try {
            let query = `
                SELECT p.purchase as item_entry, p.playerName, i.name as item_name, p.created_at
                FROM aa_tienda_purchases p
                INNER JOIN aa_store_items i ON p.purchase = i.entry
                WHERE p.rated = 0 AND p.playerId IN (
                    SELECT guid FROM characters WHERE account = ?
                )
            `;

            const params = [accountId];

            if (characterGuid) {
                query += ' AND p.playerId = ?';
                params.push(characterGuid);
            }

            query += ' ORDER BY p.created_at DESC';

            const [purchases] = await charactersPool.execute(query, params);
            return purchases;
        } catch (error) {
            console.error('Error obteniendo compras pendientes de calificación:', error);
            return [];
        }
    }

    // Enviar item por correo
    static async sendItemByMail(connection, characterGuid, itemId, itemName, characterName) {
        try {
            const [maxGuidResult] = await connection.execute(
                'SELECT COALESCE(MAX(guid), 0) as max_guid FROM item_instance'
            );
            const newGUID = parseInt(maxGuidResult[0].max_guid) + 1;

            const [maxMail] = await connection.execute(
                'SELECT COALESCE(MAX(id), 0) + 1 as next_mail_id FROM mail'
            );
            const mailId = maxMail[0].next_mail_id;

            const [itemDurability] = await worldPool.execute(
                'SELECT MaxDurability FROM item_template WHERE entry = ?',
                [itemId]
            );

            const durability = itemDurability.length > 0 ? itemDurability[0].MaxDurability : 0;

            const currentTime = Math.floor(Date.now() / 1000);
            const deliverTime = currentTime;
            const expireTime = currentTime + (30 * 24 * 60 * 60);

            await connection.execute(
                `INSERT INTO item_instance 
                 (guid, itemEntry, owner_guid, creatorGuid, giftCreatorGuid, count, duration, charges, flags, enchantments, randomPropertyId, durability, playedTime, text) 
                 VALUES (?, ?, ?, 0, 0, 1, 0, '0 0 0 0 0', 0, 
                 '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', 
                 0, ?, 0, NULL)`,
                [newGUID, itemId, characterGuid, durability]
            );

            await connection.execute(
                `INSERT INTO mail 
                 (id, messageType, stationery, mailTemplateId, sender, receiver, subject, body, has_items, expire_time, deliver_time, money, cod, checked) 
                 VALUES (?, 0, 61, 0, 1, ?, ?, ?, 1, ?, ?, 0, 0, 0)`,
                [
                    mailId,
                    characterGuid,
                    `Compra en tienda: ${itemName}`,
                    `Hola ${characterName},\n\nHas comprado ${itemName} en nuestra tienda. Esperamos que lo disfrutes!\n\nAtentamente,\nSistema de Tienda`,
                    expireTime,
                    deliverTime
                ]
            );

            await connection.execute(
                'INSERT INTO mail_items (mail_id, item_guid, receiver) VALUES (?, ?, ?)',
                [mailId, newGUID, characterGuid]
            );

        } catch (error) {
            console.error('Error enviando item por correo:', error);
            throw new Error('Error al enviar el item por correo: ' + error.message);
        }
    }

    static async checkTableData() {
        try {
            const [items] = await worldPool.execute('SELECT * FROM aa_store_items LIMIT 5');
            return { items };
        } catch (error) {
            throw error;
        }
    }

    // Validar compra
    static async validatePurchase(accountId, characterGuid, itemEntry, characterName) {
        try {
            const [tokenRows] = await charactersPool.execute(
                'SELECT tokens FROM aa_tienda_tokens WHERE accountId = ?',
                [accountId]
            );

            if (tokenRows.length === 0) {
                throw new Error('No se encontraron tokens para esta cuenta');
            }

            const userTokens = tokenRows[0].tokens;

            const [itemRows] = await worldPool.execute(
                'SELECT token_cost, name FROM aa_store_items WHERE entry = ? AND estado = 1',
                [itemEntry]
            );

            if (itemRows.length === 0) {
                throw new Error('Item no encontrado o no disponible');
            }

            const itemCost = itemRows[0].token_cost;
            const itemName = itemRows[0].name;

            if (userTokens < itemCost) {
                throw new Error(`Tokens insuficientes. Necesitas ${itemCost} tokens, tienes ${userTokens}`);
            }

            const [characterStatus] = await charactersPool.execute(
                'SELECT online FROM characters WHERE guid = ?',
                [characterGuid]
            );

            if (characterStatus.length === 0) {
                throw new Error('Personaje no encontrado');
            }

            if (characterStatus[0].online === 1) {
                throw new Error('El personaje debe estar OFFLINE para recibir items por correo');
            }

            return {
                success: true,
                valid: true,
                itemCost: itemCost,
                itemName: itemName,
                itemEntry: itemEntry,
                characterName: characterName,
                characterGuid: characterGuid,
                currentTokens: userTokens,
                message: 'Validación exitosa. Por favor califica el item antes de confirmar la compra.'
            };

        } catch (error) {
            console.error('Error validando compra:', error);
            throw error;
        }
    }

    // Confirmar compra después de la calificación
    static async confirmPurchase(accountId, characterGuid, itemEntry, characterName, rating) {
        const connection = await charactersPool.getConnection();

        try {
            await connection.beginTransaction();

            const validRating = Math.max(1, Math.min(10, parseInt(rating)));
            if (isNaN(validRating)) {
                throw new Error('Rating inválido. Debe ser entre 1 y 10');
            }

            const [tokenRows] = await connection.execute(
                'SELECT tokens FROM aa_tienda_tokens WHERE accountId = ?',
                [accountId]
            );

            if (tokenRows.length === 0) {
                throw new Error('No se encontraron tokens para esta cuenta');
            }

            const userTokens = tokenRows[0].tokens;

            const [itemRows] = await worldPool.execute(
                'SELECT token_cost, name FROM aa_store_items WHERE entry = ? AND estado = 1',
                [itemEntry]
            );

            if (itemRows.length === 0) {
                throw new Error('Item no encontrado o no disponible');
            }

            const itemCost = itemRows[0].token_cost;
            const itemName = itemRows[0].name;

            if (userTokens < itemCost) {
                throw new Error(`Tokens insuficientes. Necesitas ${itemCost} tokens, tienes ${userTokens}`);
            }

            const [characterStatus] = await connection.execute(
                'SELECT online FROM characters WHERE guid = ?',
                [characterGuid]
            );

            if (characterStatus.length === 0) {
                throw new Error('Personaje no encontrado');
            }

            if (characterStatus[0].online === 1) {
                throw new Error('El personaje debe estar OFFLINE para recibir items por correo');
            }

            const newTokenBalance = userTokens - itemCost;
            await connection.execute(
                'UPDATE aa_tienda_tokens SET tokens = ? WHERE accountId = ?',
                [newTokenBalance, accountId]
            );

            await this.sendItemByMail(connection, characterGuid, itemEntry, itemName, characterName);

            await connection.execute(
                'INSERT INTO aa_tienda_purchases (playerId, playerName, purchase, amount, estado, rated) VALUES (?, ?, ?, 1, 1, 1)',
                [characterGuid, characterName, itemEntry]
            );

            await connection.execute(
                `INSERT INTO aa_store_item_ratings (item_entry, account_id, character_guid, rating) 
             VALUES (?, ?, ?, ?)`,
                [itemEntry, accountId, characterGuid, validRating]
            );

            const [ratingStats] = await connection.execute(
                `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings 
             FROM aa_store_item_ratings 
             WHERE item_entry = ?`,
                [itemEntry]
            );

            const newAverage = parseFloat(ratingStats[0].avg_rating) || 0;
            const totalRatings = ratingStats[0].total_ratings;

            await worldPool.execute(
                'UPDATE aa_store_items SET times = times + 1, stars = ?, total_ratings = ? WHERE entry = ?',
                [newAverage.toFixed(2), totalRatings, itemEntry]
            );

            await connection.commit();

            return {
                success: true,
                newBalance: newTokenBalance,
                itemName: itemName,
                itemCost: itemCost,
                itemEntry: itemEntry,
                characterGuid: characterGuid,
                rating: validRating,
                averageRating: newAverage.toFixed(2),
                message: 'Compra completada y item enviado por correo exitosamente. ¡Gracias por tu calificación!'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Procesar iconos faltantes en lote
    static async processMissingIcons(batchSize = 10) {
        try {
            const [items] = await worldPool.execute(
                'SELECT entry, name FROM aa_store_items WHERE (icon_name IS NULL OR icon_name = "" OR icon_name = "inv_misc_questionmark.jpg") AND estado = 1 LIMIT ?',
                [batchSize]
            );

            const results = [];

            for (const item of items) {
                try {
                    const iconName = await iconService.processItemIcon(item.entry, item.name);

                    if (iconName && iconName !== 'inv_misc_questionmark.jpg') {
                        await worldPool.execute(
                            'UPDATE aa_store_items SET icon_name = ? WHERE entry = ?',
                            [iconName, item.entry]
                        );

                        results.push({
                            entry: item.entry,
                            name: item.name,
                            icon_name: iconName,
                            success: true
                        });
                    } else {
                        results.push({
                            entry: item.entry,
                            name: item.name,
                            success: false,
                            error: iconName === 'inv_misc_questionmark.jpg' ? 'Icono por defecto' : 'No se pudo obtener icono'
                        });
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    console.error(`Error procesando icono para item ${item.entry}:`, error.message);
                    results.push({
                        entry: item.entry,
                        name: item.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                total: items.length,
                processed: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results: results
            };

        } catch (error) {
            console.error('Error procesando iconos en lote:', error);
            throw error;
        }
    }
}

export default ItemModel;