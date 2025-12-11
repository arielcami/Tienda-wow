// wow-stats.js - Mapeo completo de stats para WoW 3.3.5a
// Basado en la documentación oficial de AzerothCore

const WOW_STATS = {
    // STATS PRINCIPALES
    0: "Mana",
    1: "Salud",
    3: "Agilidad",
    4: "Fuerza",
    5: "Intelecto",
    6: "Espíritu",
    7: "Aguante",

    // STATS DE DEFENSA
    12: "Índice de defensa",
    13: "Índice de esquive",
    14: "Índice de parada",
    15: "Índice de bloqueo",
    48: "Valor de bloqueo",

    // STATS DE GOLPE
    16: "Índice de golpe cuerpo a cuerpo",
    17: "Índice de golpe a distancia",
    18: "Índice de golpe con hechizos",
    31: "Índice de golpe",

    // STATS DE CRÍTICO
    19: "Índice de golpe crítico cuerpo a cuerpo",
    20: "Índice de golpe crítico a distancia",
    21: "Índice de golpe crítico con hechizos",
    32: "Índice de golpe crítico",

    // STATS DE DEFENSA (RECIBIDO)
    22: "Índice de golpe recibido cuerpo a cuerpo",
    23: "Índice de golpe recibido a distancia",
    24: "Índice de golpe recibido de hechizos",
    25: "Índice de crítico recibido cuerpo a cuerpo",
    26: "Índice de crítico recibido a distancia",
    27: "Índice de crítico recibido de hechizos",
    33: "Índice de golpe recibido",
    34: "Índice de crítico recibido",
    35: "Índice de temple",

    // STATS DE CELERIDAD
    28: "Índice de celeridad cuerpo a cuerpo",
    29: "Índice de celeridad a distancia",
    30: "Índice de celeridad con hechizos",
    36: "Índice de celeridad",

    // OTROS STATS
    37: "Índice de pericia",
    38: "Poder de ataque",
    39: "Poder de ataque a distancia",
    40: "Poder de ataque en forma felina",
    41: "Sanación de hechizos",
    42: "Daño de hechizos",
    43: "Regeneración de maná",
    44: "Índice de penetración de armadura",
    45: "Poder de hechizos",
    46: "Regeneración de salud",
    47: "Penetración de hechizos"
};

const WOW_DAMAGE_TYPES = {
    0: "Físico",
    1: "Sagrado",
    2: "Fuego",
    3: "Naturaleza",
    4: "Escarcha",
    5: "Oscuro",
    6: "Arcano"
};

const WOW_INVENTORY_TYPES = {
    0: "No equipable",
    1: "Cabeza",
    2: "Cuello",
    3: "Hombros",
    4: "Camisa",
    5: "Pecho",
    6: "Cintura",
    7: "Piernas",
    8: "Pies",
    9: "Muñecas",
    10: "Manos",
    11: "Dedo",
    12: "Abalorio",
    13: "Una mano",
    14: "Escudo",
    15: "A distancia",
    16: "Espalda",
    17: "Dos manos",
    18: "Bolsa",
    19: "Tabardo",
    20: "Toga",
    21: "Mano principal",
    22: "Mano izquierda",
    23: "Sostenido en mano izquierda",
    24: "Munición",
    25: "Arma arrojadiza",
    26: "A distancia (varitas, armas de fuego)",
    27: "Carcaj",
    28: "Reliquia"
};

const WOW_ITEM_CLASSES = {
    0: "Consumible",
    1: "Contenedor",
    2: "Arma",
    3: "Gema",
    4: "Armadura",
    5: "Reagente",
    6: "Proyectil",
    7: "Bienes de comercio",
    9: "Receta",
    11: "Carcaj",
    12: "Misión",
    13: "Llave",
    15: "Misceláneo",
    16: "Glifo"
};

const WOW_BONDING_TYPES = {
    0: "Sin vínculo",
    1: "Se liga al recogerlo",
    2: "Se liga al equiparlo",
    3: "Se liga al usarlo",
    4: "Objeto de misión",
    5: "Objeto de misión"
};

const WOW_SHEATH_TYPES = {
    1: "Arma a dos manos",
    2: "Bastón",
    3: "Una mano",
    4: "Escudo",
    5: "Vara de encantador",
    7: "Mano izquierda"
};

const WOW_SOCKET_COLORS = {
    1: "Meta",
    2: "Rojo",
    4: "Amarillo",
    8: "Azul"
};

const WOW_BAG_FAMILIES = {
    0: "Ninguno",
    1: "Flechas",
    2: "Balas",
    4: "Fragmentos de alma",
    8: "Suministros de peletería",
    16: "Suministros de inscripción",
    32: "Hierbas",
    64: "Suministros de encantamiento",
    128: "Suministros de ingeniería",
    256: "Llaves",
    512: "Gemas",
    1024: "Suministros de minería",
    2048: "Equipo ligado",
    4096: "Mascotas de vanidad",
    8192: "Monedas de divisa",
    16384: "Objetos de misión"
};

const WOW_TOTEM_CATEGORIES = {
    1: "Cuchillo de desuello (ANTIGUO)",
    2: "Tótem de tierra",
    3: "Tótem de aire",
    4: "Tótem de fuego",
    5: "Tótem de agua",
    6: "Vara de cobre rúnica",
    7: "Vara de plata rúnica",
    8: "Vara de oro rúnica",
    9: "Vara de veraplata rúnica",
    10: "Vara de arcanita rúnica",
    11: "Pico de minero (ANTIGUO)",
    12: "Piedra filosofal",
    13: "Martillo de herrero (ANTIGUO)",
    14: "Llave de arco voltaico",
    15: "Microajustador giromático",
    21: "Tótem maestro",
    41: "Vara de hierro vil rúnica",
    62: "Vara de adamantita rúnica",
    63: "Vara de eternio rúnica",
    81: "Pluma hueca",
    101: "Vara de azurita rúnica",
    121: "Juego de tinta de virtuoso",
    141: "Tambores",
    161: "Navaja multiusos gnómica",
    162: "Martillo de herrero",
    165: "Pico de minero",
    166: "Cuchillo de desuello",
    167: "Pico martillo",
    168: "Pico con filo",
    169: "Pedernal y yesca",
    189: "Vara de cobalto rúnica",
    190: "Vara de titanio rúnica"
};

// Funciones helper para obtener nombres
function getStatName(statType) {
    return WOW_STATS[statType] || `Stat ${statType}`;
}

function getDamageType(damageType) {
    return WOW_DAMAGE_TYPES[damageType] || "Físico";
}

function getInventoryType(inventoryType) {
    return WOW_INVENTORY_TYPES[inventoryType] || `Slot ${inventoryType}`;
}

function getItemClass(itemClass) {
    return WOW_ITEM_CLASSES[itemClass] || `Clase ${itemClass}`;
}

function getBondingType(bonding) {
    return WOW_BONDING_TYPES[bonding] || `Vinculo ${bonding}`;
}

function getSheathType(sheath) {
    return WOW_SHEATH_TYPES[sheath] || `Portar ${sheath}`;
}

function getSocketColor(socketColor) {
    return WOW_SOCKET_COLORS[socketColor] || `Color ${socketColor}`;
}

function getBagFamily(bagFamily) {
    return WOW_BAG_FAMILIES[bagFamily] || `Familia ${bagFamily}`;
}

function getTotemCategory(totemCategory) {
    return WOW_TOTEM_CATEGORIES[totemCategory] || `Categoría ${totemCategory}`;
}