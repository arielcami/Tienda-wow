import database from '../config/database.js';
import { executeCommand, sanitizeCommandText, safeCharacterName } from '../util/soapClient.js';

const { charactersPool, worldPool } = database;

// Servicios que se aplican con comandos de GM vía SOAP: el worldserver los ejecuta
// al instante, así que funcionan aunque el personaje esté conectado.
const SOAP_SERVICE_TYPES = ['level_up', 'gold', 'rename', 'customize', 'faction_change', 'race_change', 'unstuck'];

// Servicios que se activan al volver a entrar con el personaje (flag at_login)
const AT_LOGIN_SERVICE_TYPES = ['rename', 'customize', 'faction_change', 'race_change'];

// Razas de la Horda: orco, no-muerto, tauren, trol, elfo de sangre
const HORDE_RACES = [2, 5, 6, 8, 10];

// Máximo de dinero en 3.3.5a: 2,147,483,647 de cobre (≈ 214,748 de oro)
const MAX_MONEY_COPPER = 2147483647;

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

    // ¿Este servicio exige que el personaje esté desconectado?
    // Los que van por SOAP los aplica el propio worldserver, así que funcionan online.
    static requiresOffline(serviceType) {
        return !SOAP_SERVICE_TYPES.includes(serviceType);
    }

    // ¿El personaje ya tiene pendiente este cambio (nombre, apariencia, facción, raza)?
    // - Desconectado: basta con mirar el flag at_login en la BD.
    // - Conectado: el worldserver guarda el flag en memoria y lo escribe en la BD más tarde,
    //   así que también se revisa si ya se compró este servicio durante la sesión actual.
    static async hasPendingAtLoginService(db, characterGuid, service) {
        const flag = Number(service.at_login_flag) || 0;
        if (flag === 0) return false;

        const [rows] = await db.execute(
            'SELECT at_login, online, logout_time FROM characters WHERE guid = ?',
            [characterGuid]
        );
        if (rows.length === 0) {
            throw new Error('Personaje no encontrado');
        }

        const row = rows[0];
        if ((row.at_login & flag) !== 0) {
            return true;
        }

        if (row.online === 1) {
            const [purchases] = await db.execute(
                `SELECT 1 FROM aa_tienda_service_purchases
                 WHERE character_guid = ? AND service_id = ? AND status = 'completed'
                   AND completed_at > FROM_UNIXTIME(?)
                 LIMIT 1`,
                [characterGuid, service.id, row.logout_time || 0]
            );
            return purchases.length > 0;
        }

        return false;
    }

    // Busca en game_tele la ciudad de destino para "Desatascar".
    // Nombres configurables en .env: UNSTUCK_TELE_HORDE / UNSTUCK_TELE_ALLIANCE.
    static async resolveUnstuckLocation(race) {
        const isHorde = HORDE_RACES.includes(race);
        const preferred = isHorde
            ? (process.env.UNSTUCK_TELE_HORDE || 'Orgrimmar')
            : (process.env.UNSTUCK_TELE_ALLIANCE || 'Stormwind');
        const cityName = isHorde ? 'Orgrimmar' : 'Ventormenta';

        let [rows] = await worldPool.execute(
            'SELECT name FROM game_tele WHERE name = ? LIMIT 1',
            [preferred]
        );
        if (rows.length === 0) {
            [rows] = await worldPool.execute(
                'SELECT name FROM game_tele WHERE name LIKE ? ORDER BY CHAR_LENGTH(name) LIMIT 1',
                [`${preferred}%`]
            );
        }
        if (rows.length === 0 || !/^[A-Za-z0-9_]+$/.test(rows[0].name)) {
            console.error(`[Servicios] No existe la ubicación "${preferred}" en world.game_tele`);
            throw new Error('El servicio Desatascar no está disponible en este momento. Contacta a un administrador.');
        }

        return { location: rows[0].name, cityName };
    }

    // Reglas comunes de validación (se usan al validar y otra vez al cobrar)
    static async checkServicePreconditions(db, service, character) {
        if (character.online === 1 && this.requiresOffline(service.service_type)) {
            throw new Error('Este servicio requiere que el personaje esté OFFLINE');
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

        if (service.service_type === 'gold') {
            if (service.gold_amount <= 0) {
                throw new Error('Cantidad de oro no válida para este servicio');
            }
            const copper = service.gold_amount * 10000;
            if (Number(character.money) + copper > MAX_MONEY_COPPER) {
                throw new Error('Con este oro tu personaje superaría el límite del juego (214,748 de oro).');
            }
        }

        if (AT_LOGIN_SERVICE_TYPES.includes(service.service_type)) {
            if (await this.hasPendingAtLoginService(db, character.guid, service)) {
                throw new Error('Este personaje ya tiene este servicio pendiente. Úsalo al entrar al juego antes de volver a comprarlo.');
            }
        }

        if (service.service_type === 'unstuck') {
            await this.resolveUnstuckLocation(character.race);
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

            if (userTokens < service.token_cost) {
                throw new Error(`Tokens insuficientes. Necesitas ${service.token_cost} tokens, tienes ${userTokens}`);
            }

            await this.checkServicePreconditions(charactersPool, service, character);

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

    // IMPLEMENTAR ESTO
    static async updatePlayerXpRate(characterGuid, connection = null) {
        // Usamos la conexión de la transacción si viene, si no, usamos el pool normal
        const db = connection || charactersPool;
        
        // La consulta usa ON DUPLICATE KEY para manejar el primer boost
        const sql = `INSERT INTO aa_tienda_xp_ratings (player_guid, xp_rate) 
            VALUES (?, 2) ON DUPLICATE KEY UPDATE xp_rate = xp_rate + 1`;

        try {
            const [result] = await db.execute(sql, [characterGuid]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando XP Rate:', error);
            throw new Error('Error en la base de datos al modificar el XP Rate');
        }
    }

    // Arma el comando de GM que aplica el servicio. Devuelve null para servicios que no usan SOAP.
    static async buildServiceCommand(service, character) {
        const name = safeCharacterName(character.name);

        switch (service.service_type) {
            case 'level_up':
                return { command: `.character level ${name} 80`, message: `${character.name} ahora es nivel 80.` };

            case 'gold': {
                const gold = Number(service.gold_amount);
                const copper = gold * 10000;
                const subject = sanitizeCommandText(`Tienda: ${service.name}`);
                const body = sanitizeCommandText(`Has recibido ${String(gold).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} de oro de la tienda. Gracias por tu compra.`);
                return {
                    command: `.send money ${name} "${subject}" "${body}" ${copper}`,
                    message: 'El oro llegó al buzón de tu personaje.'
                };
            }

            case 'rename':
                return { command: `.character rename ${name}`, atLogin: true };
            case 'customize':
                return { command: `.character customize ${name}`, atLogin: true };
            case 'faction_change':
                return { command: `.character changefaction ${name}`, atLogin: true };
            case 'race_change':
                return { command: `.character changerace ${name}`, atLogin: true };

            case 'unstuck': {
                const { location, cityName } = await this.resolveUnstuckLocation(character.race);
                return {
                    command: `.teleport name ${name} ${location}`,
                    message: `${character.name} fue teletransportado a ${cityName}.`
                };
            }

            default:
                return null;
        }
    }

    // Aplica el servicio dentro de la transacción de quien lo llama (completeServicePurchase).
    // Orden: primero todo lo que es base de datos (se puede revertir) y al final el comando SOAP.
    // Si el worldserver rechaza el comando, se lanza un error, el llamador hace rollback y los tokens vuelven.
    static async applyService(connection, character, service) {
        try {
            const characterGuid = character.guid;

            if (this.requiresOffline(service.service_type)) {
                const [onlineRows] = await connection.execute(
                    'SELECT online FROM characters WHERE guid = ?',
                    [characterGuid]
                );
                if (onlineRows.length === 0 || onlineRows[0].online === 1) {
                    throw new Error('El personaje está online. No se puede aplicar el servicio.');
                }
            }

            const soap = await this.buildServiceCommand(service, character);

            if (!soap) {
                switch (service.service_type) {
                    case 'xp_boost': // NOT TESTED
                        await this.updatePlayerXpRate(characterGuid, connection);
                        break;
                    default:
                        throw new Error(`Tipo de servicio no soportado: ${service.service_type}`);
                }
            }

            const purchaseDetails = JSON.stringify({
                service_type: service.service_type,
                applied_at: new Date().toISOString(),
                character_name: character.name,
                via: soap ? 'soap' : 'db'
            });

            await connection.execute(`INSERT INTO aa_tienda_service_purchases (accountId, service_id, character_guid, character_name, price_paid, status, details, completed_at) VALUES (?, ?, ?, ?, ?, 'completed', ?, NOW())`,
                [
                    service.accountId,
                    service.id,
                    characterGuid,
                    character.name,
                    service.token_cost,
                    purchaseDetails
                ]
            );

            let message = 'Servicio aplicado exitosamente';

            if (soap) {
                const result = await executeCommand(soap.command);
                console.log(`[SOAP] ${soap.command.split(' "')[0]} -> ${result}`);

                if (soap.atLogin) {
                    message = character.online === 1
                        ? 'Listo. Sal a la pantalla de selección de personajes y vuelve a entrar para hacer el cambio.'
                        : 'Listo. El cambio se hará la próxima vez que entres con este personaje.';
                } else if (soap.message) {
                    message = soap.message;
                }
            }

            return { success: true, message };

        } catch (error) {
            console.error('Error aplicando servicio:', error);
            throw error;
        }
    }

    static async completeServicePurchase(accountId, characterGuid, serviceId) {
        const connection = await charactersPool.getConnection();

        try {
            await connection.beginTransaction();

            const service = await this.getServiceDetails(serviceId);
            const character = await this.verifyCharacterOwnership(accountId, characterGuid);

            if (!service || !character) {
                throw new Error('Validación fallida');
            }

            // Mismas reglas que en la validación (por si algo cambió entre validar y comprar)
            await this.checkServicePreconditions(connection, service, character);

            // Descuento ATÓMICO: MySQL resta sobre el saldo real y bloquea la fila
            // hasta el commit, así dos compras simultáneas no pueden gastar el mismo saldo.
            const [debit] = await connection.execute(
                'UPDATE aa_tienda_tokens SET tokens = tokens - ? WHERE accountId = ? AND tokens >= ?',
                [service.token_cost, accountId, service.token_cost]
            );

            if (debit.affectedRows === 0) {
                throw new Error('Tokens insuficientes');
            }

            const [balanceRows] = await connection.execute(
                'SELECT tokens FROM aa_tienda_tokens WHERE accountId = ?',
                [accountId]
            );
            const newTokenBalance = balanceRows[0].tokens;

            const serviceWithAccount = {
                ...service,
                accountId: accountId
            };

            // Misma conexión = misma transacción: si el servicio falla, se devuelven los tokens
            const applied = await this.applyService(connection, character, serviceWithAccount);

            try {
                await connection.commit();
            } catch (commitError) {
                // Caso muy raro: el comando ya se ejecutó pero el cobro no se guardó. Queda en el log para revisarlo.
                console.error(`[ALERTA] Servicio ${service.id} aplicado a ${character.name} (cuenta ${accountId}) pero falló el commit del cobro:`, commitError);
                throw commitError;
            }

            // Contador de ventas (otra base de datos): solo tras confirmar la compra
            try {
                await worldPool.execute(
                    'UPDATE aa_tienda_services SET times = times + 1 WHERE id = ?',
                    [service.id]
                );
            } catch (statsError) {
                console.error('Error actualizando contador del servicio:', statsError);
            }

            return {
                success: true,
                newBalance: newTokenBalance,
                serviceName: service.name,
                serviceCost: service.token_cost,
                characterGuid: characterGuid,
                message: applied.message
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