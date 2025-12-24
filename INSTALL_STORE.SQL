-- AUTH
USE one_wow_authentication;

DROP TABLE IF EXISTS aa_tienda_login;

CREATE TABLE
    aa_tienda_login (
        accountId INT PRIMARY KEY,
        accountUsername VARCHAR(30) NOT NULL UNIQUE,
        `password` VARCHAR(100) NOT NULL,
        `try` TINYINT NOT NULL DEFAULT 0
    );

-- CHARACTERS
USE one_wow_characters;

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

DROP TABLE IF EXISTS aa_tienda_service_purchases;

CREATE TABLE 
    aa_tienda_service_purchases (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        accountId INT UNSIGNED NOT NULL,
        service_id INT UNSIGNED NOT NULL,
        character_guid INT UNSIGNED NOT NULL,
        character_name VARCHAR(20) NOT NULL,
        price_paid INT UNSIGNED NOT NULL,
        status enum('pending', 'completed', 'cancelled', 'failed') NOT NULL DEFAULT 'pending',
        details TEXT,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    );

DROP TABLE IF EXISTS aa_tienda_xp_ratings;

CREATE TABLE aa_tienda_xp_ratings (
    player_guid INT UNSIGNED PRIMARY KEY, 
    xp_rate TINYINT UNSIGNED DEFAULT 1, 
    player_name VARCHAR(25)
);

-- WORLD
USE one_wow_world;

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
            'Arco',
            'Ballesta',
            'Arma arrojadiza',
            'Varita',
            'Sostén en mano izquierda',
            'Arma de fuego',
            'Tótem',
            'Tratado',
            'Sigilo',
            'Ídolo',
            'Camisa',
            'Armadura de tela',
            'Armadura de cuero',
            'Armadura de malla',
            'Armadura de placas',
            'Escudo',
            'Anillo',
            'Cuello',
            'Abalorio',
            'Capa',
            'Tabardo',
            'Bolsa',
            'Gema',
            'Encantamiento',
            'Montura',
            'Mascota',
            'Consumible',
            'Receta'
        ) NOT NULL DEFAULT 'Armadura de placas',
        tooltip_image VARCHAR(150) DEFAULT NULL,
        token_cost SMALLINT UNSIGNED NOT NULL,
        `times` INT UNSIGNED NOT NULL DEFAULT 0,
        stars DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        total_ratings INT UNSIGNED NOT NULL DEFAULT 0,
        estado TINYINT (1) DEFAULT 1,
        PRIMARY KEY (entry)
    );


DROP TABLE IF EXISTS aa_tienda_services;

CREATE TABLE aa_tienda_services (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
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

-- Servicios disponibles en la tienda:
INSERT INTO aa_tienda_services (`name`, `description`, token_cost, service_type, category, at_login_flag, gold_amount, level_amount, required_level, max_level, is_active, `times`) VALUES 
('Nivel 80', 'Si adquieres este servicio, subirás instantáneamente a nivel 80 con el personaje seleccionado.', 20, 'level_up', 'Nivel', 0, 0, 0, 1, 80, 1, 0),
('500 de oro', 'Al adquirir este servicio, se te aumenta 500 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 4, 'gold', 'Oro', 0, 500, 0, 1, 80, 1, 0),
('1,000 de oro', 'Al adquirir este servicio, se te aumenta 1,000 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 8, 'gold', 'Oro', 0, 1000, 0, 1, 80, 1, 0),
('5,000 de oro', 'Al adquirir este servicio, se te aumenta 5,000 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 35, 'gold', 'Oro', 0, 5000, 0, 1, 80, 1, 0),
('25,000 de oro', 'Al adquirir este servicio, se te aumenta 25,000 a tu oro instantáneamente. (CUIDADO: No superar los 214, 000 de oro)', 150, 'gold', 'Oro', 0, 25000, 0, 1, 80, 1, 0),
('Cambio de nombre', 'Si compras este servicio, tu personaje contará con un cambio de nombre antes de logear.', 5, 'rename', 'Nombre', 1, 0, 0, 1, 80, 1, 1),
('Cambio de apariencia', 'Al adquirir este servicio, podrás cambiar la apariencia física de tu personaje y también su nombre. Podrás hacerlo antes de entrar al mundo.', 10, 'customize', 'Cambiar apariencia', 8, 0, 0, 1, 80, 1, 0),
('Cambio de facción', 'Al comprar este servicio, se te permite cambiar entre la Alianza y la Horda solo una vez. Incluye también un cambio de apariencia y de nombre.', 40, 'faction_change', 'Cambiar facción', 64, 0, 0, 1, 80, 1, 0),
('Cambio de raza', 'Si adquieres este servicio, podrás cambiar la raza de tu personaje (Entre razas que comparten clase), también incluye un cambio de nombre.', 30, 'race_change', 'Cambiar raza', 128, 0, 0, 1, 80, 1, 0),
('Desatascar', 'Si adquieres este servicio, se teletransportará tu personaje a Orgrimmar o Ventormenta, dependiendo de tu facción.', 1, 'unstuck', 'Desatascar', 0, 0, 0, 1, 80, 1, 0),
('Aumentar XP Rate +1', 'Si compras este servicio, tu RATE de ganancia de XP aumentará + 1.', 2, 'xp_boost', 'XP Rate', 0, 0, 0, 1, 80, 1, 0);

-- Algunos objetos para vender en la tienda:
INSERT INTO aa_store_items (entry, `name`, icon_name, category, tooltip_image, token_cost, `times`, stars, total_ratings, estado) VALUES 

-- Guerrero Furia - Paladín Retribución - DK Profano
(45516, "Voldrethar, la hoja oscura de olvido", NULL, 'Espada de dos manos', NULL, 30, 0, 0.00, 0, 1),

-- Guerrero Protección - Paladín Protección - DK Escarcha
(45442, "Sorthalis, martillo de los vigías", NULL, 'Maza', NULL, 15, 0, 0.00, 0, 1),

-- Paladín Sagrado - Druida Restauración - Sacerdote Sagrado - Chamán Restauración
(45612, "Constellus", NULL, 'Maza', NULL, 15, 0, 0.00, 0, 1),

-- Cazador Puntería - Pícaro - Guerrero
(45570, "Ballesta cieloforja", NULL, 'Ballesta', NULL, 15, 0, 0.00, 0, 1),

-- Cazador Puntería - Druida Feral
(45613, "Vinculasueños", NULL, 'Bastón', NULL, 30, 0, 0.00, 0, 1),

-- Pícaro - Cazador
(45448, "Mordedura azarosa", NULL, 'Daga', NULL, 15, 0, 0.00, 0, 1),
(45296, "Hojas giratorias", NULL, 'Arma arrojadiza', NULL, 15, 0, 0.00, 0, 1),

-- Sacerdote Disciplina/Sombra - Chamán Elemental - Mago - Brujo - Druida Equilibrio
(45620, "Filo de fragmento estelar", NULL, 'Daga', NULL, 15, 0, 0.00, 0, 1),    --> Crítico y golpe
(45527, "Escriba de almas", NULL, 'Daga', NULL, 15, 0, 0.00, 0, 1),             --> Crítico y Celeridad
(45617, "Cosmos", NULL, 'Sostén en mano izquierda', NULL, 15, 0, 0.00, 0, 1),   --> Crítico y golpe
(50309, "Corazón marchito", NULL, 'Sostén en mano izquierda', NULL, 15, 0, 0.00, 0, 1), --> Crítico y Celeridad

-- Caballero de la Muerte Sangre/Escarcha - Chamán Mejora - Pícaro 
(50303, "Carámbano negro", NULL, 'Maza', NULL, 15, 0, 0.00, 0, 1),

-- Chamán Mejora
(45489, "Puño de la locura", NULL, 'Arma de puño', NULL, 15, 0, 0.00, 0, 1),
(45315, "Creapiedras", NULL, 'Maza', NULL, 15, 0, 0.00, 0, 1),

-- Mago - Brujo - Druida Equilibrio - Sacerdote Disciplina/Sombras
(45234, "Éxtasis", NULL, 'Bastón', NULL, 30, 0, 0.00, 0, 1),
(45990, "Hoja de fusión", NULL, 'Espada', NULL, 15, 0, 0.00, 0, 1),

-- Monturas Voladoras
(32458, "Cenizas de A'lar", 'inv_misc_summerfest_brazierorange.jpg', 'Montura', '32458.png', 20, 0, 0.00, 0, 1),
(45693, "Cabeza de Mimiron", 'inv_misc_enggizmos_03', 'Montura', '45693.png', 20, 0, 0.00, 0, 1),
(54860, "Cohete de paseo X-53", NULL, 'Montura', NULL, 20, 0, 0.00, 0, 1),
(50435, "Vermis de escarcha de Gladiador colérico", NULL, 'Montura', NULL, 20, 0, 0.00, 0, 1),

-- Terrestres
(33225, "Riendas del tigre espectral presto", NULL, 'Montura', NULL, 15, 0, 0.00, 0, 1),
(19902, "Tigre Zulian presto", NULL, 'Montura', NULL, 15, 0, 0.00, 0, 1),
(32768, "Riendas del Lord Cuervo", NULL, 'Montura', NULL, 15, 0, 0.00, 0, 1),
(33809, "Oso de guerra Amani", NULL, 'Montura', NULL, 15, 0, 0.00, 0, 1),
(54811, "Corcel celestial", NULL, 'Montura', NULL, 25, 0, 0.00, 0, 1),

-- Inventario
(23162, "Foror's Crate of Endless Resist Gear Storage", NULL, 'Bolsa', NULL, 35, 0, 0.00, 0, 1),
(51809, "Agujero portátil", NULL, 'Bolsa', NULL, 15, 0, 0.00, 0, 1);



INSERT IGNORE INTO `creature_template` (
`entry`, `difficulty_entry_1`, `difficulty_entry_2`, `difficulty_entry_3`, `KillCredit1`, `KillCredit2`, 
`name`, `subname`, `IconName`, `gossip_menu_id`, `minlevel`, `maxlevel`, `exp`, `faction`, `npcflag`, `speed_walk`, 
`speed_run`, `speed_swim`, `speed_flight`, `detection_range`, `scale`, `rank`, `dmgschool`, `DamageModifier`, `BaseAttackTime`, `RangeAttackTime`, 
`BaseVariance`, `RangeVariance`, `unit_class`, `unit_flags`, `unit_flags2`, `dynamicflags`, `family`, `trainer_type`, `trainer_spell`, `trainer_class`, 
`trainer_race`, `type`, `type_flags`, `lootid`, `pickpocketloot`, `skinloot`, `PetSpellDataId`, `VehicleId`, `mingold`, `maxgold`, 
`AIName`, `MovementType`, `HoverHeight`, `HealthModifier`, `ManaModifier`, `ArmorModifier`, `ExperienceModifier`, `RacialLeader`, `movementId`, `RegenHealth`, 
`mechanic_immune_mask`, `spell_school_immune_mask`, `flags_extra`, `ScriptName`, `VerifiedBuild`) 
VALUES 
(60000,0,0,0,0,0,'Siobahn Sombraluz','|cff00c8ffStaff Wow One|r','',0,83,83,2,35,1,1.1,1.14286,1,1,20,1.1,3,0,1,2000,2000,1,1,8,0,0,0,0,0,0,0,0,7,4,0,0,0,0,0,0,0,'',0,1,350,350,1,1,0,0,1,0,0,0,'',12340),
(60001,0,0,0,0,0,'El Sapo','|cff00c8ffVendedor Especial|r','',0,83,83,2,35,4224,1,1.14286,1,1,20,1.5,3,0,1,2000,2000,1,1,1,768,2048,0,0,0,0,0,0,7,4,0,0,0,0,0,0,0,'',0,1,1,1,1,1,0,0,1,0,0,0,'',12340),
(60002,0,0,0,0,0,'Kikki Ricky','|cff00c8ffMaestro de Glifos|r','',0,83,83,2,35,1,1.1,1.14286,1,1,20,1.3,3,0,1,2000,2000,1,1,8,0,0,0,0,0,0,0,0,7,4,0,0,0,0,0,0,0,'',0,1,350,350,1,1,0,0,1,0,0,0,'',12340),
(60003,0,0,0,0,0,'Michael Jackson','|cff00c8ffVendedor de objetos|r','',0,83,83,2,35,1,1.1,1.14286,1,1,20,1.1,3,0,1,2000,2000,1,1,8,0,0,0,0,0,0,0,0,7,4,0,0,0,0,0,0,0,'',0,1,350,350,1,1,0,0,1,0,0,0,'',12340);


INSERT INTO `creature_template_model` (`CreatureID`, `Idx`, `CreatureDisplayID`, `DisplayScale`, `Probability`, `VerifiedBuild`) VALUES
(60000, 0, 21419, 1, 100, 12340),
(60001, 0, 391, 1, 100, 12340),
(60002, 0, 17806, 1, 100, 12340),
(60003, 0, 16540, 1, 100, 12340);

UPDATE item_template SET stackable = 2000, bonding = 1, quality = 4, SellPrice = 0, description = "Reune 20 unidades y llévalos a Siobahn Sombraluz para comprar 1 Token." 
WHERE entry IN (4814, 3730, 5637, 10285, 8151, 12037, 24478, 43013);
