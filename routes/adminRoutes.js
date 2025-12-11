import express from 'express';
import database from '../config/database.js';

const router = express.Router();
const { authPool, worldPool } = database;

// Lista de categorías válidas (deben coincidir con el ENUM de la BD)
const VALID_CATEGORIES = [
    'Hacha',
    'Hacha de dos manos',
    'Espada',
    'Espada de dos manos',
    'Maza',
    'Maza de dos manos',
    'Arma de asta',
    'Bastón',
    'Daga',
    'Arma de puño',
    'Armadura de tela',
    'Armadura de cuero',
    'Armadura de malla',
    'Armadura de placas',
    'Escudo',
    'Anillo',
    'Cuello',
    'Abalorio',
    'Capa',
    'Bolsa',
    'Gema',
    'Encantamiento'
];

// Ruta para verificar permisos de admin
router.post('/check-permissions', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.json({ isAdmin: false });
        }

        const [rows] = await authPool.execute(
            'SELECT id FROM account WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.json({ isAdmin: false });
        }

        const accountId = rows[0].id;
        const isAdmin = accountId === 1;

        res.json({
            isAdmin,
            accountId
        });

    } catch (error) {
        console.error('Error verificando permisos admin:', error);
        res.json({ isAdmin: false });
    }
});

// Obtener todos los items de la tienda
router.get('/items', async (req, res) => {
    try {
        const [items] = await worldPool.execute(`
            SELECT 
                entry, 
                name, 
                icon_name,
                category,
                tooltip_image,
                token_cost, 
                estado,
                times,
                stars,
                total_ratings
            FROM aa_store_items 
            ORDER BY entry
        `);

        res.json({ success: true, items });

    } catch (error) {
        console.error('Error obteniendo items admin:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo items' });
    }
});

// Obtener detalles de un item específico
router.get('/items/:entry', async (req, res) => {
    try {
        const entry = req.params.entry;

        const [items] = await worldPool.execute(`
            SELECT 
                entry, 
                name, 
                icon_name,
                category,
                tooltip_image,
                token_cost, 
                estado
            FROM aa_store_items 
            WHERE entry = ?
        `, [entry]);

        if (items.length === 0) {
            return res.status(404).json({ success: false, error: 'Item no encontrado' });
        }

        res.json({ success: true, item: items[0] });

    } catch (error) {
        console.error('Error obteniendo item admin:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo item' });
    }
});

// Crear/agregar nuevo item a la tienda
router.post('/items', async (req, res) => {
    try {
        const { entry, name, category, tooltip_image, token_cost } = req.body;

        // Validaciones básicas
        if (!entry || !name || token_cost === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos: entry, name, token_cost'
            });
        }

        if (isNaN(entry) || entry <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Entry debe ser un número positivo'
            });
        }

        if (isNaN(token_cost) || token_cost < 0) {
            return res.status(400).json({
                success: false,
                error: 'Token_cost debe ser un número positivo o cero'
            });
        }

        // Validar categoría si se proporciona
        if (category && !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Categoría inválida. Debe ser una de: ${VALID_CATEGORIES.join(', ')}`
            });
        }

        // Verificar si el item ya existe
        const [existing] = await worldPool.execute(
            'SELECT entry FROM aa_store_items WHERE entry = ?',
            [entry]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'El item ya existe en la tienda'
            });
        }

        // Insertar nuevo item
        await worldPool.execute(
            `INSERT INTO aa_store_items 
            (entry, name, icon_name, category, tooltip_image, token_cost, estado) 
            VALUES (?, ?, NULL, ?, ?, ?, 1)`,
            [
                entry,
                name,
                category || 'Armadura de placas', // Valor por defecto
                tooltip_image || null,
                token_cost
            ]
        );

        res.json({
            success: true,
            message: 'Item agregado a la tienda exitosamente',
            item: {
                entry,
                name,
                category: category || 'Armadura de placas',
                tooltip_image: tooltip_image || null,
                token_cost,
                estado: 1
            }
        });

    } catch (error) {
        console.error('Error creando item admin:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                error: 'El item ya existe en la tienda'
            });
        }

        res.status(500).json({ success: false, error: 'Error creando item' });
    }
});

// Actualizar un item existente
router.put('/items/:entry', async (req, res) => {
    try {
        const entry = req.params.entry;
        const { name, category, tooltip_image, token_cost, estado } = req.body;

        // Validar que el item existe
        const [existing] = await worldPool.execute(
            'SELECT * FROM aa_store_items WHERE entry = ?',
            [entry]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        const currentItem = existing[0];

        // Validar categoría si se proporciona
        if (category && !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Categoría inválida. Debe ser una de: ${VALID_CATEGORIES.join(', ')}`
            });
        }

        // Actualizar item
        await worldPool.execute(
            `UPDATE aa_store_items 
            SET name = ?, 
                category = ?,
                tooltip_image = ?,
                token_cost = ?, 
                estado = ?
            WHERE entry = ?`,
            [
                name || currentItem.name,
                category || currentItem.category,
                tooltip_image !== undefined ? tooltip_image : currentItem.tooltip_image,
                token_cost !== undefined ? token_cost : currentItem.token_cost,
                estado !== undefined ? estado : currentItem.estado,
                entry
            ]
        );

        res.json({
            success: true,
            message: 'Item actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando item admin:', error);
        res.status(500).json({ success: false, error: 'Error actualizando item' });
    }
});

// Eliminar/desactivar un item
router.delete('/items/:entry', async (req, res) => {
    try {
        const entry = req.params.entry;

        const [existing] = await worldPool.execute(
            'SELECT entry FROM aa_store_items WHERE entry = ?',
            [entry]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        await worldPool.execute(
            'UPDATE aa_store_items SET estado = 0 WHERE entry = ?',
            [entry]
        );

        res.json({
            success: true,
            message: 'Item desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando item admin:', error);
        res.status(500).json({ success: false, error: 'Error eliminando item' });
    }
});

// Reactivar un item
router.put('/items/:entry/reactivate', async (req, res) => {
    try {
        const entry = req.params.entry;

        const [existing] = await worldPool.execute(
            'SELECT entry FROM aa_store_items WHERE entry = ?',
            [entry]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        await worldPool.execute(
            'UPDATE aa_store_items SET estado = 1 WHERE entry = ?',
            [entry]
        );

        res.json({
            success: true,
            message: 'Item reactivado exitosamente'
        });

    } catch (error) {
        console.error('Error reactivando item admin:', error);
        res.status(500).json({ success: false, error: 'Error reactivando item' });
    }
});

export default router;