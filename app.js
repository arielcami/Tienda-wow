import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import database from './config/database.js';


// Para manejar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import servicesRoutes from './routes/servicesRoutes.js';
import accountRoutes from './routes/accountRoutes.js';

const { authPool } = database;

const app = express();
const PORT = process.env.PORT || 3000;

// No anunciar que el servidor usa Express
app.disable('x-powered-by');

// Si el portal está detrás de un proxy (Nginx, Cloudflare, etc.) pon TRUST_PROXY=1 en .env
// para que req.ip sea la IP real del jugador y no la del proxy.
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Cabeceras básicas de seguridad
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
});

// Secreto de sesión: debe venir de .env (SESSION_SECRET). Si falta, se genera uno al azar
// (funciona, pero todos los jugadores pierden la sesión cada vez que reinicias el portal).
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    sessionSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[AVISO] SESSION_SECRET no está en .env: se usó uno temporal. Las sesiones se perderán al reiniciar.');
}

// Configuración
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    name: 'wowstore.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,                                  // JavaScript del navegador no puede leer la cookie
        sameSite: 'lax',                                 // otros sitios no pueden enviar peticiones con tu sesión
        secure: process.env.COOKIE_SECURE === 'true',    // pon COOKIE_SECURE=true cuando uses HTTPS
        maxAge: 12 * 60 * 60 * 1000                      // la sesión dura 12 horas
    }
}));

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Middleware para verificar admin
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user.username) {
            return res.status(401).json({
                error: 'Acceso denegado: No autenticado'
            });
        }

        const username = req.session.user.username;

        const [rows] = await authPool.execute(
            'SELECT id FROM account WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                error: 'Acceso denegado: Cuenta no encontrada'
            });
        }

        const accountId = rows[0].id;

        if (accountId !== 1) {
            return res.status(403).json({
                error: 'Acceso denegado: No tiene permisos de administrador'
            });
        }

        req.adminAccountId = accountId;
        req.adminUsername = username;

        next();

    } catch (error) {
        console.error('Error en middleware admin:', error);
        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

// Usar rutas
app.use('/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', requireAdmin, adminRoutes);
app.use('/api/services', requireAuth, servicesRoutes);
app.use('/api/account', requireAuth, accountRoutes);

// Servir archivos estáticos
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/icons', express.static(path.join(__dirname, 'public/icon_images')));
app.use('/tooltips', express.static(path.join(__dirname, 'public/tooltips')));
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});
app.get('/servicios', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/services.html'));
});

// Ruta principal redirige a tienda o login
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/tienda');
    } else {
        res.redirect('/auth/login');
    }
});

app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        username: req.session.user.username,
    });
});

// Ruta de la tienda (protegida)
app.get('/tienda', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/tienda.html'));
});

// Ruta del panel admin (protegida)
app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin.html'));
});

app.get('/api/admin/check', requireAuth, async (req, res) => {
    try {
        const username = req.session.user.username;
        const [rows] = await authPool.execute(
            'SELECT id FROM account WHERE username = ?',
            [username]
        );

        const isAdmin = rows.length > 0 && rows[0].id === 1;
        res.json({ isAdmin });
    } catch (error) {
        console.error('Error verificando admin:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Ruta de prueba de conexión a BD (solo admin; no muestra detalles del error al navegador)
app.get('/test-db', requireAdmin, async (req, res) => {
    try {
        const { worldPool } = database;
        const [rows] = await worldPool.execute('SELECT 1 + 1 AS result');
        res.json({ message: 'Conexión a BD exitosa', result: rows[0].result });
    } catch (error) {
        console.error('Error en /test-db:', error);
        res.status(500).json({ error: 'No se pudo conectar a la base de datos (revisa la consola del portal)' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor de tienda WoW ejecutándose en http://localhost:' + PORT);
    console.log('Rutas disponibles:');
    console.log('  • Login: http://localhost:' + PORT + '/auth/login');
    console.log('  • Registro: http://localhost:' + PORT + '/auth/register');
    console.log('  • Tienda: http://localhost:' + PORT + '/tienda (requiere login)');
    console.log('  • Servicios: http://localhost:' + PORT + '/servicios (requiere login)');
    console.log('  • Admin: http://localhost:' + PORT + '/admin (solo ID 1)');
    console.log('  • Test DB: http://localhost:' + PORT + '/test-db (solo admin)');
    console.log('  • Tooltips: http://localhost:' + PORT + '/tooltips/ (imágenes estáticas)');
});