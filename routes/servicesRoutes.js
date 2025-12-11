import express from 'express';
import ServiceModel from '../models/serviceModel.js';

const router = express.Router();

const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'No autenticado' });
    }
};

router.get('/categories', requireAuth, async (req, res) => {
    try {
        const categories = await ServiceModel.getServiceCategories();
        res.json({ categories });
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.get('/all', requireAuth, async (req, res) => {
    try {
        const services = await ServiceModel.getAllServices();
        res.json({ services });
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.get('/by-category/:category', requireAuth, async (req, res) => {
    try {
        const { category } = req.params;
        const { limit } = req.query;
        const services = await ServiceModel.getServicesByCategory(category, limit);
        res.json({ services });
    } catch (error) {
        console.error('Error obteniendo servicios por categoría:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.get('/details/:serviceId', requireAuth, async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await ServiceModel.getServiceDetails(serviceId);

        if (!service) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        res.json({ service });
    } catch (error) {
        console.error('Error obteniendo detalles del servicio:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.get('/characters', requireAuth, async (req, res) => {
    try {
        const characters = await ServiceModel.getCharacters(req.session.user.accountId);
        res.json({ characters });
    } catch (error) {
        console.error('Error obteniendo personajes:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.post('/validate', requireAuth, async (req, res) => {
    try {
        const { characterGuid, serviceId } = req.body;
        const accountId = req.session.user.accountId;

        const validation = await ServiceModel.validateServicePurchase(
            accountId,
            characterGuid,
            serviceId
        );

        res.json(validation);

    } catch (error) {
        console.error('Error validando servicio:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/purchase', requireAuth, async (req, res) => {
    try {
        const { characterGuid, serviceId, characterName } = req.body;
        const accountId = req.session.user.accountId;

        const character = await ServiceModel.verifyCharacterOwnership(accountId, characterGuid);
        if (!character) {
            return res.status(400).json({ error: 'Personaje no válido' });
        }

        const result = await ServiceModel.completeServicePurchase(
            accountId,
            characterGuid,
            serviceId,
            characterName || character.name
        );

        res.json(result);

    } catch (error) {
        console.error('Error en compra de servicio:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/purchases', requireAuth, async (req, res) => {
    try {
        const accountId = req.session.user.accountId;
        const connection = await database.charactersPool.getConnection();

        try {
            const [purchases] = await connection.execute(
                `SELECT sp.*, s.name as service_name, s.service_type
                 FROM aa_tienda_service_purchases sp
                 JOIN aa_tienda_services s ON sp.service_id = s.id
                 WHERE sp.accountId = ?
                 ORDER BY sp.purchased_at DESC
                 LIMIT 50`,
                [accountId]
            );

            res.json({ purchases });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error obteniendo compras:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

export default router;