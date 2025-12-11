import express from 'express';
import ItemModel from '../models/itemModel.js';

const router = express.Router();

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'No autenticado' });
    }
};

// Obtener personajes del usuario
router.get('/characters', requireAuth, async (req, res) => {
    try {
        const characters = await ItemModel.getCharacters(req.session.user.accountId);
        res.json({ characters });
    } catch (error) {
        console.error('Error obteniendo personajes:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Realizar compra
router.post('/purchase', requireAuth, async (req, res) => {
    try {
        const { characterGuid, itemEntry, characterName } = req.body;
        const accountId = req.session.user.accountId;

        // Verificar que el personaje pertenece al usuario
        const character = await ItemModel.verifyCharacterOwnership(accountId, characterGuid);
        if (!character) {
            return res.status(400).json({ error: 'Personaje no válido' });
        }

        // Realizar la compra
        const result = await ItemModel.purchaseItem(accountId, characterGuid, itemEntry, characterName);

        res.json(result);

    } catch (error) {
        console.error('Error en compra:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


// Validar compra (sin ejecutarla todavía)
router.post('/validate', requireAuth, async (req, res) => {
    try {
        const { characterGuid, itemEntry } = req.body;
        const accountId = req.session.user.accountId;

        // Verificar que el personaje pertenece al usuario
        const character = await ItemModel.verifyCharacterOwnership(accountId, characterGuid);
        if (!character) {
            return res.status(400).json({ error: 'Personaje no válido' });
        }

        // Validar compra (sin ejecutarla)
        const validation = await ItemModel.validatePurchase(accountId, characterGuid, itemEntry, character.name);

        res.json(validation);

    } catch (error) {
        console.error('Error validando compra:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Confirmar compra después de la calificación
router.post('/confirm', requireAuth, async (req, res) => {
    try {
        const { characterGuid, itemEntry, characterName, rating } = req.body;
        const accountId = req.session.user.accountId;

        // Verificar que el personaje pertenece al usuario
        const character = await ItemModel.verifyCharacterOwnership(accountId, characterGuid);
        if (!character) {
            return res.status(400).json({ error: 'Personaje no válido' });
        }

        // Realizar la compra con calificación
        const result = await ItemModel.confirmPurchase(accountId, characterGuid, itemEntry, characterName, rating);

        res.json(result);

    } catch (error) {
        console.error('Error confirmando compra:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;