import express from 'express';
import AuthModel from '../models/authModel.js';
import database from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateVerifier } from '../util/srp6Util.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = express.Router();
const { authPool, charactersPool } = database; // Añadir authPool

// Para manejar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Página de login
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/tienda');
    }

    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Wow One</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=MedievalSharp&display=swap');
        
        :root {
            --gold-primary: #ffd700;
            --gold-secondary: #b8860b;
            --epic-purple: #a335ee;
            --rare-blue: #0070dd;
            --common-gray: #9d9d9d;
            --wow-dark: #1a1a1a;
            --wow-darker: #0d0d0d;
        }

        body {
            font-family: 'Cinzel', serif;
            background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #2d2d2d 100%);
            min-height: 100vh;
            overflow: hidden;
        }

        .wow-gold {
            background: linear-gradient(135deg, var(--gold-primary), var(--gold-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .wow-epic {
            color: var(--epic-purple);
            text-shadow: 0 0 10px rgba(163, 53, 238, 0.5);
        }

        .login-container {
            background: linear-gradient(135deg, rgba(13, 13, 13, 0.95), rgba(26, 26, 26, 0.95));
            border: 2px solid;
            border-image: linear-gradient(135deg, var(--gold-primary), var(--gold-secondary), var(--epic-purple)) 1;
            border-radius: 20px;
            position: relative;
            backdrop-filter: blur(10px);
        }

        .input-epic {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(45, 45, 45, 0.9));
            border: 2px solid rgba(255, 215, 0, 0.3);
            color: white;
            font-family: 'MedievalSharp', cursive;
            transition: all 0.3s ease;
        }

        .input-epic:focus {
            border-color: var(--gold-primary);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            background: linear-gradient(135deg, rgba(32, 32, 32, 0.9), rgba(55, 55, 55, 0.9));
        }

        .btn-epic {
            background: linear-gradient(135deg, var(--epic-purple), #6715a3);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(163, 53, 238, 0.3);
            font-family: 'Cinzel', serif;
            cursor: pointer;
        }

        .btn-epic:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(163, 53, 238, 0.5);
            background: linear-gradient(135deg, #b145f0, #7820c0);
        }

        .floating-islands {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: -1;
            overflow: hidden;
        }

        .island {
            position: absolute;
            background: linear-gradient(135deg, #2d2d2d, #1a1a1a);
            border: 1px solid var(--gold-primary);
            border-radius: 50%;
            opacity: 0.1;
            animation: float 20s infinite ease-in-out;
        }

        .island:nth-child(1) {
            width: 200px;
            height: 200px;
            top: 10%;
            left: 5%;
            animation-delay: 0s;
        }

        .island:nth-child(2) {
            width: 150px;
            height: 150px;
            top: 60%;
            right: 10%;
            animation-delay: -5s;
        }

        .island:nth-child(3) {
            width: 100px;
            height: 100px;
            bottom: 20%;
            left: 20%;
            animation-delay: -10s;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }

        .error-message {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        /* Asegurar que los inputs sean clickeables */
        input, button {
            position: relative;
            z-index: 10;
        }

        .form-group {
            position: relative;
            z-index: 10;
        }

        /* Estilos para el enlace de registro */
        .register-link {
            color: var(--rare-blue);
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s ease;
        }

        .register-link:hover {
            color: var(--gold-primary);
            text-decoration: underline;
        }
    </style>
</head>
<body class="min-h-screen text-white flex items-center justify-center p-4">
    <!-- Fondos flotantes -->
    <div class="floating-islands">
        <div class="island"></div>
        <div class="island"></div>
        <div class="island"></div>
    </div>

    <!-- Container Principal del Login -->
    <div class="login-container rounded-2xl p-8 max-w-md w-full">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full mb-4 border-4 border-yellow-400">
                <i class="fas fa-crown text-3xl text-white"></i>
            </div>
            <h1 class="text-4xl font-bold wow-gold mb-2">Wow One - Login</h1>
            <p class="text-gray-400" style="font-family: 'MedievalSharp', cursive;">AzerothCore 3.3.5a</p>
        </div>

        <!-- Mensaje de Error -->
        ${req.query.error ? `
        <div class="error-message mb-6">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span>${req.query.error}</span>
        </div>
        ` : ''}

        <!-- Formulario de Login -->
        <form method="POST" action="/auth/login" class="space-y-6">
            <!-- Campo Usuario -->
            <div class="form-group">
                <label for="username" class="block text-yellow-400 mb-2 font-bold">
                    <i class="fas fa-user mr-2"></i>Nombre de Usuario
                </label>
                <input type="text" id="username" name="username" required
                    class="input-epic w-full px-4 py-3 rounded-lg focus:outline-none"
                    placeholder="Ingresa tu usuario..."
                    autocomplete="username">
            </div>

            <!-- Campo Contraseña -->
            <div class="form-group">
                <label for="password" class="block text-yellow-400 mb-2 font-bold">
                    <i class="fas fa-lock mr-2"></i>Contraseña
                </label>
                <input type="password" id="password" name="password" required
                    class="input-epic w-full px-4 py-3 rounded-lg focus:outline-none"
                    placeholder="Ingresa tu contraseña..."
                    autocomplete="current-password">
            </div>

            <!-- Botón de Login -->
            <button type="submit" class="btn-epic w-full py-4 text-lg">
                <i class="fas fa-dragon mr-2"></i>INGRESAR
            </button>
        </form>

        <!-- Enlace a Registro -->
        <div class="mt-8 text-center">
            <p class="text-gray-400">
                ¿No tienes cuenta? 
                <a href="/auth/register" class="register-link">
                    <i class="fas fa-user-plus mr-1"></i>Regístrate aquí
                </a>
            </p>
            <p class="text-gray-400 text-sm mt-2">
                <i class="fas fa-shield-alt mr-2"></i>
                Tu aventura épica te espera
            </p>
        </div>
    </div>

    <script>
        // Efecto de escritura en los placeholders
        document.addEventListener('DOMContentLoaded', function() {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            let usernamePlaceholders = ['Thrall', 'Jaina', 'Arthas', 'Sylvanas', 'Illidan', 'Terenas', 'Muradin', 'Sindragosa'];
            let passwordPlaceholders = ['••••••••', 'contraseña épica', 'secreto ancestral', '***********'];
            
            let currentUserIndex = 0;
            let currentPassIndex = 0;
            
            if (usernameInput && passwordInput) {
                setInterval(() => {
                    usernameInput.placeholder = usernamePlaceholders[currentUserIndex];
                    currentUserIndex = (currentUserIndex + 1) % usernamePlaceholders.length;
                }, 2000);
                
                setInterval(() => {
                    passwordInput.placeholder = passwordPlaceholders[currentPassIndex];
                    currentPassIndex = (currentPassIndex + 1) % passwordPlaceholders.length;
                }, 1500);
            }
        });
    </script>
</body>
</html>
    `);
});

// Página de registro
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/tienda');
    }

    // Enviar el archivo HTML de registro
    res.sendFile(path.join(__dirname, '../views/registro.html'));
});

// Procesar login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const result = await AuthModel.loginTienda(username, password);

    if (result.success) {
        req.session.user = result.user;
        res.redirect('/tienda');
    } else {
        res.redirect(`/auth/login?error=${encodeURIComponent(result.message)}`);
    }
});

// Procesar registro de cuenta
router.post('/register', async (req, res) => {
    let accountId = null;

    try {
        const { username, password, confirmPassword } = req.body;

        // 1. Validaciones básicas (igual que en Java y frontend)
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Por favor complete todos los campos.'
            });
        }

        if (username.length < 3 || username.length > 16) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario debe tener entre 3 y 16 caracteres.'
            });
        }

        if (username.includes(' ')) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario no puede contener espacios.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres.'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden.'
            });
        }

        const usernameLower = username.toLowerCase();
        const usernameUpper = username.toUpperCase();
        const passwordUpper = password.toUpperCase();

        // 2. Verificar si usuario ya existe en AMBAS tablas
        const [existingCoreAccounts] = await authPool.execute(
            'SELECT id FROM account WHERE username = ?',
            [usernameLower]
        );

        const [existingTiendaAccounts] = await authPool.execute(
            'SELECT accountId FROM aa_tienda_login WHERE accountUsername = ?',
            [usernameLower]
        );

        if (existingCoreAccounts.length > 0 || existingTiendaAccounts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso. Por favor, elija otro.'
            });
        }

        // 3. Generar salt aleatorio de 32 bytes para SRP6 (Core)
        const salt = crypto.randomBytes(32);

        // 4. Calcular verifier SRP6 para el core
        const verifier = calculateVerifier(usernameUpper, passwordUpper, salt);

        // 5. Insertar en la BD del core (acore_auth.account)
        const [coreResult] = await authPool.execute(
            `INSERT INTO account (username, salt, verifier, session_key, email, reg_mail, expansion, last_ip, last_attempt_ip, failed_logins, locked, lock_country, online, 
              mutetime, mutereason, muteby, locale, os, recruiter, totaltime) VALUES (?, ?, ?, NULL, '', '', 2, '127.0.0.1', '127.0.0.1', 0, 0, '00', 0, 0, '', '', 0, '', 0, 0)`,
            [usernameLower, salt, verifier]
        );

        accountId = coreResult.insertId;

        // 6. Cifrar contraseña para la tienda con bcrypt (mismo método que AuthModel usa)
        const tiendaPasswordHash = await bcrypt.hash(password, 10);

        // 7. Insertar en la tabla de login de la tienda (aa_tienda_login)
        // Nota: try = 1 (intentos), como en tu script original
        await authPool.execute(
            'INSERT INTO aa_tienda_login (accountId, accountUsername, password, try) VALUES (?, ?, ?, 1)',
            [accountId, usernameLower, tiendaPasswordHash]
        );

        // 8. Crear entrada en la tabla de tokens (si existe en characters DB)
        try {
            await charactersPool.execute(
                'INSERT INTO aa_tienda_tokens (accountId, tokens) VALUES (?, 0)',
                [accountId]
            );
        } catch (tokenError) {
            // Ignorar si la tabla no existe o hay error
            // console.log('Nota: No se pudo crear entrada de tokens:', tokenError.message);
        }

        // 9. Log de éxito
        //(`Cuenta creada: ${usernameLower} (ID: ${accountId})`);
        //console.log(`   - Core: account table (SRP6)`);
        //console.log(`   - Tienda: aa_tienda_login (bcrypt)`);
        //console.log(`   - Tokens: aa_tienda_tokens creada`);

        return res.json({
            success: true,
            message: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.',
            accountId: accountId
        });

    } catch (error) {
        console.error('Error en registro:', error);

        // Rollback en caso de error
        if (accountId) {
            try {
                // Intentar eliminar de aa_tienda_login (en auth DB)
                try {
                    await authPool.execute('DELETE FROM aa_tienda_login WHERE accountId = ?', [accountId]);
                    // console.log(`Rollback: Eliminado de aa_tienda_login (ID: ${accountId})`);
                } catch (tiendaError) {
                    // console.log('No se pudo eliminar de aa_tienda_login:', tiendaError.message);
                }

                // Eliminar del core account
                await authPool.execute('DELETE FROM account WHERE id = ?', [accountId]);
                // console.log(`Rollback: Eliminado de account table (ID: ${accountId})`);

                // Intentar eliminar tokens (en characters DB)
                try {
                    await charactersPool.execute('DELETE FROM aa_tienda_tokens WHERE accountId = ?', [accountId]);
                } catch (tokenError) {
                    // Ignorar error de tokens
                }

            } catch (rollbackError) {
                console.error('Error durante rollback:', rollbackError);
            }
        }

        // Mensajes de error específicos
        let errorMessage = 'Error interno del servidor al crear la cuenta.';

        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'El nombre de usuario ya existe. Por favor, elija otro.';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Error de integridad referencial en la base de datos.';
        } else if (error.message.includes('bcrypt')) {
            errorMessage = 'Error al cifrar la contraseña.';
        }

        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

// Obtener personajes
router.get('/characters', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    const characters = await AuthModel.getCharacters(req.session.user.accountId);
    res.json(characters);
});

// Obtener tokens del usuario
router.get('/tokens', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const [rows] = await charactersPool.execute('SELECT tokens FROM aa_tienda_tokens WHERE accountId = ?', [req.session.user.accountId]);
        const tokens = rows.length > 0 ? rows[0].tokens : 0;
        res.json({ tokens });
    } catch (error) {
        console.error('Error obteniendo tokens:', error);
        res.json({ tokens: 0 });
    }
});

export default router;