import database from '../config/database.js';
import bcrypt from 'bcryptjs';

const { authPool, charactersPool } = database;

class AuthModel {
    // Verificar credenciales en aa_tienda_login
    static async loginTienda(username, password) {
        try {
            const [rows] = await authPool.execute(
                'SELECT * FROM aa_tienda_login WHERE accountUsername = ?',
                [username]
            );

            if (rows.length === 0) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            const user = rows[0];

            // Verificar intentos de login
            if (user.try >= 5) {
                return { success: false, message: 'Cuenta bloqueada por muchos intentos fallidos. \nPonte en contacto con un Administrador.' };
            }

            // Verificar contraseña
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                // Incrementar intentos fallidos
                await authPool.execute(
                    'UPDATE aa_tienda_login SET try = try + 1 WHERE accountUsername = ?',
                    [username]
                );
                return { success: false, message: 'Datos inválidos' };
            }

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