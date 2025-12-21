import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const dbConfig = {
    auth: {
        host: process.env.DB_AUTH_HOST || 'localhost',
        user: process.env.DB_AUTH_USER || 'root',
        password: process.env.DB_AUTH_PASSWORD || 'acore',
        database: process.env.DB_AUTH_DATABASE || 'one_wow_authentication',
        port: process.env.DB_AUTH_PORT || 3306
    },
    characters: {
        host: process.env.DB_CHARACTERS_HOST || 'localhost',
        user: process.env.DB_CHARACTERS_USER || 'root',
        password: process.env.DB_CHARACTERS_PASSWORD || 'acore',
        database: process.env.DB_CHARACTERS_DATABASE || 'one_wow_characters',
        port: process.env.DB_CHARACTERS_PORT || 3306
    },
    world: {
        host: process.env.DB_WORLD_HOST || 'localhost',
        user: process.env.DB_WORLD_USER || 'root',
        password: process.env.DB_WORLD_PASSWORD || 'acore',
        database: process.env.DB_WORLD_DATABASE || 'one_wow_world',
        port: process.env.DB_WORLD_PORT || 3306
    }
};

// Crear pools de conexión
const authPool = createPool(dbConfig.auth);
const charactersPool = createPool(dbConfig.characters);
const worldPool = createPool(dbConfig.world);

export default {
    authPool,
    charactersPool,
    worldPool
};