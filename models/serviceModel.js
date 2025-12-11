import database from '../config/database.js';

const { charactersPool, worldPool } = database;

class ServiceModel {

    static async getServicesByCategory(category, limit = 50) {
        try {
            const limitNumber = parseInt(limit);
            const validLimit = isNaN(limitNumber) || limitNumber <= 0 ? 50 : limitNumber;

            const query = `
                SELECT id, name, description, token_cost, service_type, category,
                       at_login_flag, gold_amount, level_amount, required_level,
                       max_level, is_active, times
                FROM aa_tienda_services 
                WHERE is_active = 1 AND category = ?
                ORDER BY name
                LIMIT ${validLimit}
            `;

            const [services] = await worldPool.execute(query, [category]);
            return services;

        } catch (error) {
            console.error('Error obteniendo servicios por categoría:', error);
            return [];
        }
    }

    static async getCharacters(accountId) {
        try {
            const [characters] = await charactersPool.execute(
                `SELECT guid, name, race, gender, class, level, online, money FROM characters WHERE account = ?  ORDER BY name`,
                [accountId]
            );
            return characters;
        } catch (error) {
            console.error('Error obteniendo personajes:', error);
            return [];
        }
    }

    static async getAllServices() {
        try {
            const [services] = await worldPool.execute(`
                SELECT id, name, description, token_cost, service_type, category,
                       at_login_flag, gold_amount, level_amount, required_level,
                       max_level, is_active, times
                FROM aa_tienda_services 
                WHERE is_active = 1
                ORDER BY category, name
            `);
            return services;
        } catch (error) {
            console.error('Error obteniendo todos los servicios:', error);
            return [];
        }
    }

    static async getServiceDetails(serviceId) {
        try {
            const [services] = await worldPool.execute(
                `SELECT id, name, description, token_cost, service_type, category,
                        at_login_flag, gold_amount, level_amount, required_level,
                        max_level, is_active, times
                 FROM aa_tienda_services WHERE id = ? AND is_active = 1`,
                [serviceId]
            );

            return services.length > 0 ? services[0] : null;
        } catch (error) {
            console.error('Error obteniendo detalles del servicio:', error);
            throw error;
        }
    }

    static async verifyCharacterOwnership(accountId, characterGuid) {
        try {
            const [characters] = await charactersPool.execute(
                'SELECT guid, name, race, class, level, online, money FROM characters WHERE account = ? AND guid = ?',
                [accountId, characterGuid]
            );

            return characters.length > 0 ? characters[0] : null;
        } catch (error) {
            console.error('Error verificando propiedad del personaje:', error);
            return null;
        }
    }

    static async isCharacterOnline(characterGuid) {
        try {
            const [result] = await charactersPool.execute(
                'SELECT online FROM characters WHERE guid = ?',
                [characterGuid]
            );
            return result.length > 0 ? result[0].online === 1 : false;
        } catch (error) {
            console.error('Error verificando estado online:', error);
            return true;
        }
    }

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

    static async validateServicePurchase(accountId, characterGuid, serviceId) {
        try {
            const userTokens = await this.getUserTokens(accountId);
            const service = await this.getServiceDetails(serviceId);
            const character = await this.verifyCharacterOwnership(accountId, characterGuid);

            if (!service) {
                throw new Error('Servicio no encontrado o no disponible');
            }

            if (!character) {
                throw new Error('Personaje no encontrado o no pertenece a tu cuenta');
            }

            if (character.online === 1) {
                throw new Error('El personaje debe estar OFFLINE para aplicar servicios');
            }

            if (userTokens < service.token_cost) {
                throw new Error(`Tokens insuficientes. Necesitas ${service.token_cost} tokens, tienes ${userTokens}`);
            }

            if (character.level < service.required_level) {
                throw new Error(`Nivel mínimo requerido: ${service.required_level}. Tu personaje es nivel ${character.level}`);
            }

            if (character.level > service.max_level) {
                throw new Error(`Este servicio es para personajes hasta nivel ${service.max_level}. Tu personaje es nivel ${character.level}`);
            }

            if (service.service_type === 'level_up' && character.level >= 80) {
                throw new Error('Tu personaje ya es nivel 80');
            }

            if (service.service_type === 'gold' && service.gold_amount <= 0) {
                throw new Error('Cantidad de oro no válida para este servicio');
            }

            return {
                success: true,
                service: service,
                character: character,
                currentTokens: userTokens,
                valid: true,
                message: 'Validación exitosa'
            };

        } catch (error) {
            console.error('Error validando compra de servicio:', error);
            throw error;
        }
    }

    static async applyService(characterGuid, service, characterName) {
        const connection = await charactersPool.getConnection();

        try {
            await connection.beginTransaction();

            const isOnline = await this.isCharacterOnline(characterGuid);
            if (isOnline) {
                throw new Error('El personaje está online. No se puede aplicar el servicio.');
            }

            let updateQuery = '';
            let updateParams = [];

            switch (service.service_type) {
                case 'level_up': // TESTED: OK
                    updateQuery = 'UPDATE characters SET level = 80, xp = 0 WHERE guid = ?';
                    updateParams = [characterGuid];
                    break;

                case 'gold': // TESTED: OK
                    const goldInCopper = service.gold_amount * 10000;
                    updateQuery = 'UPDATE characters SET money = money + ? WHERE guid = ?';
                    updateParams = [goldInCopper, characterGuid];
                    break;

                case 'rename': // TESTED: OK
                    updateQuery = 'UPDATE characters SET at_login = at_login + ? WHERE guid = ?';
                    updateParams = [service.at_login_flag, characterGuid];
                    break;

                case 'customize': // TESTED: OK
                    updateQuery = 'UPDATE characters SET at_login = at_login + ? WHERE guid = ?';
                    updateParams = [service.at_login_flag, characterGuid];
                    break;

                case 'faction_change': // TESTED: OK
                    updateQuery = 'UPDATE characters SET at_login = at_login + ? WHERE guid = ?';
                    updateParams = [service.at_login_flag, characterGuid];
                    break;

                case 'race_change': // TESTED: OK
                    updateQuery = 'UPDATE characters SET at_login = at_login + ? WHERE guid = ?';
                    updateParams = [service.at_login_flag, characterGuid];
                    break;

                case 'unstuck': // TESTED: OK
                    updateQuery = 'UPDATE characters SET map = 1, position_x = -7129.0693, position_y = -3789.144, position_z = 8.369192, orientation = 5.9766 WHERE guid = ?';
                    updateParams = [characterGuid];
                    break;

                default:
                    throw new Error(`Tipo de servicio no soportado: ${service.service_type}`);
            }

            if (updateQuery) {
                const [result] = await connection.execute(updateQuery, updateParams);
                if (result.affectedRows === 0) {
                    throw new Error('No se pudo aplicar el servicio al personaje');
                }
            }

            // Se actualiza world, no characters
            await worldPool.execute(
                'UPDATE aa_tienda_services SET times = times + 1 WHERE id = ?',
                [service.id]
            );

            const purchaseDetails = JSON.stringify({
                service_type: service.service_type,
                applied_at: new Date().toISOString(),
                character_name: characterName
            });

            await connection.execute(`INSERT INTO aa_tienda_service_purchases (accountId, service_id, character_guid, character_name, price_paid, status, details, completed_at) VALUES (?, ?, ?, ?, ?, 'completed', ?, NOW())`,
                [
                    service.accountId,
                    service.id,
                    characterGuid,
                    characterName,
                    service.token_cost,
                    purchaseDetails
                ]
            );

            await connection.commit();
            return { success: true, message: 'Servicio aplicado exitosamente' };

        } catch (error) {
            await connection.rollback();
            console.error('Error aplicando servicio:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async completeServicePurchase(accountId, characterGuid, serviceId, characterName) {
        const connection = await charactersPool.getConnection();

        try {
            await connection.beginTransaction();

            const userTokens = await this.getUserTokens(accountId);
            const service = await this.getServiceDetails(serviceId);
            const character = await this.verifyCharacterOwnership(accountId, characterGuid);

            if (!service || !character) {
                throw new Error('Validación fallida');
            }

            if (character.online === 1) {
                throw new Error('El personaje debe estar OFFLINE');
            }

            if (userTokens < service.token_cost) {
                throw new Error('Tokens insuficientes');
            }

            const newTokenBalance = userTokens - service.token_cost;
            await connection.execute(
                'UPDATE aa_tienda_tokens SET tokens = ? WHERE accountId = ?',
                [newTokenBalance, accountId]
            );

            // CORRECCIÓN: Agregar accountId al objeto service
            const serviceWithAccount = {
                ...service,
                accountId: accountId
            };

            await this.applyService(characterGuid, serviceWithAccount, characterName);

            await connection.commit();

            return {
                success: true,
                newBalance: newTokenBalance,
                serviceName: service.name,
                serviceCost: service.token_cost,
                characterGuid: characterGuid,
                message: 'Servicio aplicado exitosamente'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getServiceCategories() {
        try {
            const [categories] = await worldPool.execute(
                'SELECT DISTINCT category FROM aa_tienda_services WHERE is_active = 1 ORDER BY category'
            );
            return categories.map(cat => cat.category);
        } catch (error) {
            console.error('Error obteniendo categorías de servicios:', error);
            return [];
        }
    }
}

export default ServiceModel;