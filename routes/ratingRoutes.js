import express from 'express';
import ItemModel from '../models/itemModel.js';
import database from '../config/database.js';

const router = express.Router();
const { worldPool } = database;

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'No autenticado' });
    }
};

// Obtener compras pendientes de calificación
router.get('/pending', requireAuth, async (req, res) => {
    try {
        const { characterGuid } = req.query;
        const pendingRatings = await ItemModel.getPendingRatings(
            req.session.user.accountId,
            characterGuid
        );

        res.json({ pendingRatings });
    } catch (error) {
        console.error('Error obteniendo compras pendientes:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Calificar un item después de la compra
router.post('/rate', requireAuth, async (req, res) => {
    try {
        const { characterGuid, itemEntry, rating } = req.body;
        const accountId = req.session.user.accountId;

        // Validaciones básicas
        if (!characterGuid || !itemEntry || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Faltan parámetros requeridos'
            });
        }

        const result = await ItemModel.rateItem(accountId, characterGuid, itemEntry, rating);

        res.json(result);

    } catch (error) {
        console.error('Error calificando item:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener rating actual de un item
router.get('/item/:entry', requireAuth, async (req, res) => {
    try {
        const [items] = await worldPool.execute(
            'SELECT stars, total_ratings FROM aa_store_items WHERE entry = ?',
            [req.params.entry]
        );

        if (items.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        res.json({
            averageRating: items[0].stars,
            totalRatings: items[0].total_ratings
        });
    } catch (error) {
        console.error('Error obteniendo rating del item:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

export default router;