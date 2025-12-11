import express from 'express';
import ItemModel from '../models/itemModel.js';
import database from '../config/database.js';

const { worldPool } = database;
const router = express.Router();

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'No autenticado' });
    }
};

// Obtener items por categoría
router.get('/category/:categoryName', requireAuth, async (req, res) => {
    try {
        const { categoryName } = req.params;
        const { limit = 50 } = req.query;

        if (!categoryName || categoryName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Nombre de categoría requerido'
            });
        }

        const items = await ItemModel.getItemsByCategory(categoryName, parseInt(limit));

        res.json({
            success: true,
            category: categoryName,
            items: items,
            count: items.length
        });

    } catch (error) {
        console.error('Error obteniendo items por categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener todas las categorías disponibles
router.get('/categories', requireAuth, async (req, res) => {
    try {
        const [categories] = await worldPool.execute(
            `SELECT DISTINCT category 
             FROM aa_store_items 
             WHERE estado = 1 
             ORDER BY category`
        );

        const categoryList = categories.map(cat => cat.category);

        res.json({
            success: true,
            categories: categoryList
        });

    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener detalles simplificados de un item
router.get('/details/:entry', requireAuth, async (req, res) => {
    try {
        const itemEntry = parseInt(req.params.entry);

        if (!itemEntry || itemEntry <= 0) {
            return res.status(400).json({
                success: false,
                error: 'ID de item inválido'
            });
        }

        const itemData = await ItemModel.getItemDetails(itemEntry);

        if (!itemData) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        res.json({
            success: true,
            item: itemData
        });

    } catch (error) {
        console.error('Error obteniendo detalles del item:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Ruta de debug
router.get('/debug/data', requireAuth, async (req, res) => {
    try {
        const tableData = await ItemModel.checkTableData();
        res.json(tableData);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener tokens del usuario
router.get('/user/tokens', requireAuth, async (req, res) => {
    try {
        const tokens = await ItemModel.getUserTokens(req.session.user.accountId);
        res.json({
            success: true,
            tokens
        });
    } catch (error) {
        console.error('Error obteniendo tokens:', error);
        res.json({
            success: true,
            tokens: 0
        });
    }
});

export default router;