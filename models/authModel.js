import database from '../config/database.js';
import bcrypt from 'bcryptjs';
import { isBlocked, registerFailure, registerSuccess } from '../util/loginLimiter.js';

const { authPool, charactersPool } = database;

class AuthModel {
    // Verificar credenciales en aa_tienda_login
    static async loginTienda(username, password, ip = 'desconocida') {
        // Mismo mensaje si el usuario no existe o la clave es incorrecta:
        // así no se puede averiguar qué cuentas existen.
        const INVALID = { success: false, message: 'Usuario o contraseña incorrectos' };

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            return INVALID;
        }

        const block = isBlocked(username, ip);
        if (block.blocked) {
            return { success: false, message: `Demasiados intentos fallidos. Intenta de nuevo en ${block.retryInMin} minuto(s).` };
        }

        try {
            const [rows] = await authPool.execute(
                'SELECT * FROM aa_tienda_login WHERE accountUsername = ?',
                [username]
            );

            if (rows.length === 0) {
                registerFailure(username, ip);
                return INVALID;
            }

            const user = rows[0];

            // Verificar contraseña
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                // Incrementar intentos fallidos
                // Se sigue contando en la BD como registro, pero ya no bloquea la cuenta para siempre
                await authPool.execute(
                    'UPDATE aa_tienda_login SET try = try + 1 WHERE accountUsername = ?',
                    [username]
                );
                registerFailure(username, ip);
                return INVALID;
            }

            registerSuccess(username);

            // Resetear intentos en login exitoso
            await authPool.execute('UPDATE aa_tienda_login SET try = 0 WHERE accountUsername = ?', [username]);

            return { 
                success: true, 
                user: { 
                    accountId: user.accountId, 
                    username: user.accountUsername 
                } 
            };

        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error del servidor' };
        }
    }

    // Obtener personajes de la cuenta
    static async getCharacters(accountId) {
        try {
            const [rows] = await charactersPool.execute(`SELECT guid, name, race, class, gender, level FROM characters WHERE account = ? ORDER BY name`, [accountId]);
            return rows;
        } catch (error) {
            console.error('Error obteniendo personajes:', error);
            return [];
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
}

export default AuthModel;