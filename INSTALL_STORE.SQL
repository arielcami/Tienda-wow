-- AUTH
USE acore_auth;

UPDATE realmlist set `name` = 'Wow One' WHERE id = 1;
DELETE FROM uptime;

DROP TABLE IF EXISTS aa_tienda_login;

CREATE TABLE
    aa_tienda_login (
        accountId INT PRIMARY KEY,
        accountUsername VARCHAR(30) NOT NULL UNIQUE,
        `password` VARCHAR(100) NOT NULL,
        `try` TINYINT NOT NULL DEFAULT 0
    );

-- CHARACTERS
USE acore_characters;

DROP TABLE IF EXISTS aa_store_item_ratings;

CREATE TABLE
    aa_store_item_ratings (
        id INT UNSIGNED AUTO_INCREMENT,
        item_entry INT UNSIGNED NOT NULL,
        account_id INT UNSIGNED NOT NULL,
        character_guid INT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY `idx_item_entry` (item_entry),
        KEY `idx_account_id` (account_id)
    );

DROP TABLE IF EXISTS aa_tienda_purchases;

CREATE TABLE
    aa_tienda_purchases (
        id INT NOT NULL AUTO_INCREMENT,
        playerId INT UNSIGNED NOT NULL,
        playerName VARCHAR(30) NOT NULL,
        purchase INT UNSIGNED NOT NULL,
        amount TINYINT UNSIGNED NOT NULL DEFAULT 1,
        estado TINYINT UNSIGNED DEFAULT 1,
        rated TINYINT (1) DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    );

DROP TABLE IF EXISTS aa_tienda_tokens;

CREATE TABLE
    aa_tienda_tokens (
        accountId INT UNSIGNED NOT NULL,
        tokens SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        UNIQUE KEY `accountId` (`accountId`)
    );

-- WORLD
USE acore_world;

DROP TABLE IF EXISTS aa_store_item_ratings;

CREATE TABLE
    aa_store_item_ratings (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        item_entry INT UNSIGNED NOT NULL,
        account_id INT UNSIGNED NOT NULL,
        character_guid INT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY `unique_purchase_rating` (item_entry, account_id, character_guid),
        KEY `idx_item_entry` (item_entry),
        KEY `idx_account_id` (account_id)
    );

DROP TABLE IF EXISTS aa_store_items;

CREATE TABLE
    aa_store_items (
        entry INT UNSIGNED NOT NULL,
        `name` VARCHAR(100) NOT NULL,
        icon_name VARCHAR(150) DEFAULT NULL,
        category enum (
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
        ) NOT NULL DEFAULT 'Armadura de placas',
        tooltip_image VARCHAR(150) DEFAULT NULL,
        token_cost SMALLINT UNSIGNED NOT NULL,
        `times` INT UNSIGNED NOT NULL DEFAULT 0,
        stars DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        total_ratings INT UNSIGNED NOT NULL DEFAULT 0,
        estado TINYINT (1) DEFAULT 1,
        PRIMARY KEY (entry)
    );
    
DROP TABLE IF EXISTS aa_tienda_purchases;

CREATE TABLE
    aa_tienda_purchases (
        id INT UNSIGNED AUTO_INCREMENT,
        playerId INT UNSIGNED NOT NULL,
        playerName VARCHAR(30) NOT NULL,
        purchase INT UNSIGNED NOT NULL,
        amount TINYINT UNSIGNED NOT NULL DEFAULT 1,
        estado TINYINT UNSIGNED DEFAULT 1,
        rated TINYINT (1) DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    );

DROP TABLE IF EXISTS aa_tienda_services;

CREATE TABLE aa_tienda_services (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` text,
    token_cost SMALLINT UNSIGNED NOT NULL DEFAULT '0',
    service_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) DEFAULT NULL,
    at_login_flag INT UNSIGNED DEFAULT '0',
    gold_amount INT UNSIGNED DEFAULT '0',
    level_amount TINYINT UNSIGNED DEFAULT '0',
    required_level TINYINT UNSIGNED DEFAULT '1',
    max_level TINYINT UNSIGNED DEFAULT '80',
    is_active TINYINT(1) DEFAULT '1',
    `times` INT UNSIGNED DEFAULT '0',
    PRIMARY KEY (id)
);

INSERT INTO aa_tienda_services (`name`, `description`, token_cost, service_type, category, at_login_flag, gold_amount, level_amount, required_level, max_level, is_active, `times`)
VALUES
('Nivel 80', 'Si adquieres este servicio, subirás instantáneamente a nivel 80 con el personaje seleccionado.', 25, 'level_up', 'Nivel', 0, 0, 0, 1, 80, 1, 4),
('500 de oro', 'Al adquirir este servicio, se te aumenta 500 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 15, 'gold', 'Oro', 0, 500, 0, 1, 80, 1, 1),
('1000 de oro', 'Al adquirir este servicio, se te aumenta 1, 000 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 25, 'gold', 'Oro', 0, 1000, 0, 1, 80, 1, 1),
('5000 de oro', 'Al adquirir este servicio, se te aumenta 5, 000 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 40, 'gold', 'Oro', 0, 5000, 0, 1, 80, 1, 1),
('Cambio de nombre', 'Si compras este servicio, tu personaje contará con un cambio de nombre antes de logear.', 5, 'rename', 'Nombre', 1, 0, 0, 1, 80, 1, 1),
('Cambio de apariencia', 'Al adquirir este servicio, podrás cambiar la apariencia física de tu personaje y también su nombre. Podrás hacerlo antes de entrar al mundo.', 10, 'customize', 'Cambiar apariencia', 8, 0, 0, 1, 80, 1, 3),
('Cambio de facción', 'Al comprar este servicio, se te permite cambiar entre la Alianza y la Horda solo una vez. Incluye también un cambio de apariencia y de nombre.', 40, 'faction_change', 'Cambiar facción', 64, 0, 0, 1, 80, 1, 1),
('Cambio de raza', 'Si adquieres este servicio, podrás cambiar la raza de tu personaje (Entre razas que comparten clase), también incluye un cambio de nombre.', 30, 'race_change', 'Cambiar raza', 128, 0, 0, 1, 80, 1, 1),
('Desatascar', 'Si adquieres este servicio, se teletransportará tu personaje a Gadgetzán, Tanaris.', 5, 'unstuck', 'Desatascar', 0, 0, 0, 1, 80, 1, 2);

-- OPCIONAL: LIMPIEZA DE LOCALES QUE NO SE USAN:
/*
DELETE FROM achievement_reward_locale WHERE Locale NOT IN ('esMX');
DELETE FROM broadcast_text_locale WHERE locale NOT IN ('esMX');
DELETE FROM broadcast_text_locale WHERE locale NOT IN ('esMX');
DELETE FROM creature_template_locale WHERE locale NOT IN ('esMX');
DELETE FROM creature_text_locale WHERE Locale NOT IN ('esMX');
DELETE FROM gameobject_template_locale WHERE locale NOT IN ('esMX');
DELETE FROM gossip_menu_option_locale WHERE Locale NOT IN ('esMX');
DELETE FROM item_set_names_locale WHERE locale NOT IN ('esMX');
DELETE FROM item_template_locale WHERE locale NOT IN ('esMX');
DELETE FROM npc_text_locale WHERE Locale NOT IN ('esMX');
DELETE FROM page_text_locale WHERE locale NOT IN ('esMX');
DELETE FROM pet_name_generation_locale WHERE Locale NOT IN ('esMX');
DELETE FROM points_of_interest_locale WHERE locale NOT IN ('esMX');
DELETE FROM quest_greeting_locale WHERE locale NOT IN ('esMX');
DELETE FROM quest_offer_reward_locale WHERE locale NOT IN ('esMX');
DELETE FROM quest_request_items_locale WHERE locale NOT IN ('esMX');
DELETE FROM quest_template_locale WHERE locale NOT IN ('esMX');
*/