import express from 'express';
import database from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { calculateVerifier } from '../util/srp6Util.js';

const router = express.Router();
const { authPool } = database;

// Middleware para verificar autenticación (ya existe en app.js, pero lo incluimos por seguridad)
const requireAuth = (req, res, next) => {
    if (req.session.user && req.session.user.accountId) {
        next();
    } else {
        res.status(401).json({ error: 'No autenticado' });
    }
};

// Aplicar middleware a todas las rutas
router.use(requireAuth);

// Obtener información de la cuenta del usuario
router.get('/info', async (req, res) => {
    try {
        const accountId = req.session.user.accountId;

        // Obtener información básica de la cuenta del core
        const [accountRows] = await authPool.execute(
            `SELECT 
                username,
                joindate,
                last_ip,
                online,
                expansion,
                mutetime,
                mutereason,
                muteby,
                os,
                totaltime
            FROM account 
            WHERE id = ?`,
            [accountId]
        );

        if (accountRows.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }

        const accountInfo = accountRows[0];

        // Formatear fechas y tiempos
        const formattedInfo = {
            username: accountInfo.username,
            joindate: accountInfo.joindate ? new Date(accountInfo.joindate).toLocaleString('es-ES') : 'No disponible',
            last_ip: accountInfo.last_ip || 'No registrada',
            online: accountInfo.online === 1 ? 'En línea' : 'Desconectado',
            expansion: getExpansionName(accountInfo.expansion),
            mutetime: formatMuteTime(accountInfo.mutetime),
            mutereason: accountInfo.mutereason || 'No aplica',
            muteby: accountInfo.muteby || 'Nadie',
            os: getOSName(accountInfo.os),
            totaltime: formatPlayTime(accountInfo.totaltime)
        };

        res.json({
            success: true,
            account: formattedInfo
        });

    } catch (error) {
        console.error('Error obteniendo información de cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar contraseña del usuario (actualiza AMBAS tablas)
router.post('/change-password', async (req, res) => {
    let connection;
    
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const accountId = req.session.user.accountId;
        const username = req.session.user.username;

        // 1. Validaciones básicas
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son obligatorios'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Las nuevas contraseñas no coinciden'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 8 caracteres'
            });
        }

        // 2. Obtener conexión para transacción
        connection = await authPool.getConnection();
        await connection.beginTransaction();

        // 3. Verificar contraseña actual en aa_tienda_login (bcrypt)
        const [tiendaRows] = await connection.execute(
            'SELECT password FROM aa_tienda_login WHERE accountId = ?',
            [accountId]
        );

        if (tiendaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Cuenta de tienda no encontrada'
            });
        }

        const currentHashedPassword = tiendaRows[0].password;
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentHashedPassword);

        if (!isCurrentPasswordValid) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'La contraseña actual es incorrecta'
            });
        }

        // 4. Actualizar aa_tienda_login con nueva contraseña (bcrypt)
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        await connection.execute(
            'UPDATE aa_tienda_login SET password = ?, try = 0 WHERE accountId = ?',
            [newHashedPassword, accountId]
        );

        // 5. Actualizar account (SRP6) - para el juego
        // Generar nuevo salt
        const newSalt = crypto.randomBytes(32);
        
        // Calcular nuevo verifier (SRP6)
        const usernameUpper = username.toUpperCase();
        const passwordUpper = newPassword.toUpperCase();
        const newVerifier = calculateVerifier(usernameUpper, passwordUpper, newSalt);

        // Actualizar tabla account
        await connection.execute(
            'UPDATE account SET salt = ?, verifier = ? WHERE id = ?',
            [newSalt, newVerifier, accountId]
        );

        // 6. Confirmar transacción
        await connection.commit();

        // 7. Registrar el cambio (opcional)
        // console.log(`Contraseña cambiada para cuenta ID: ${accountId}, Usuario: ${username}`);

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente. Tu nueva contraseña funciona tanto en la tienda como en el juego.'
        });

    } catch (error) {
        // 7. Rollback en caso de error
        if (connection) {
            await connection.rollback();
        }
        
        console.error('Error cambiando contraseña:', error);
        
        let errorMessage = 'Error interno del servidor';
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'Error de duplicación en base de datos';
        } else if (error.message.includes('bcrypt')) {
            errorMessage = 'Error al cifrar la contraseña';
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    } finally {
        // 8. Liberar conexión
        if (connection) {
            connection.release();
        }
    }
});

// Funciones auxiliares para formatear datos
function getExpansionName(expansionId) {
    const expansions = {
        0: 'Vanilla',
        1: 'The Burning Crusade',
        2: 'Wrath of the Lich King',
        3: 'Cataclysm',
        4: 'Mists of Pandaria',
        5: 'Warlords of Draenor',
        6: 'Legion',
        7: 'Battle for Azeroth',
        8: 'Shadowlands',
        9: 'Dragonflight',
        10: 'The War Within',
        11: 'Midnight',
        12: 'The Last Titan'
    };
    return expansions[expansionId] || `Expansión ${expansionId}`;
}

function getOSName(osCode) {
    const osNames = {
        'Win': 'Windows',
        'Mac': 'Mac OS',
        'Lin': 'Linux',
        '': 'No registrado'
    };
    return osNames[osCode] || osCode;
}

function formatMuteTime(mutetime) {
    const muteTime = Number(mutetime);
    
    // No silenciado
    if (!muteTime || muteTime <= 0) {
        return 'No silenciado';
    }
    
    // Silencio permanente
    if (muteTime === 1) {
        return 'Silenciado permanentemente';
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Si es timestamp futuro, muestra tiempo restante
    if (muteTime > now) {
        const remaining = muteTime - now;
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m restantes`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m restantes`;
        } else {
            return `${minutes}m restantes`;
        }
    }
    
    // Para cualquier otro caso (pasado o valor extraño)
    return 'Silencio expirado';
}

function formatPlayTime(seconds) {
    if (!seconds || seconds <= 0) {
        return '0 horas';
    }
    
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
        return `${days} días, ${remainingHours} horas`;
    } else {
        return `${hours} horas`;
    }
}

export default router;