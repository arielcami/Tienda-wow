const bcrypt = require('bcryptjs');
const { authPool } = require('../config/database');

async function hashPassword() {
    const username = process.argv[2];
    const plainPassword = process.argv[3];

    if (!username || !plainPassword) {
        //console.log('Uso: node scripts/hashPassword.js <usuario> <contraseña>');
        //console.log('Ejemplo: node scripts/hashPassword.js miUsuario miPassword123');
        return;
    }

    try {
        // Cifrar la contraseña
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Insertar o actualizar usuario en aa_tienda_login
        const [result] = await authPool.execute(
            `INSERT INTO aa_tienda_login (accountId, accountUsername, password, try) 
             VALUES (?, ?, ?, 0) 
             ON DUPLICATE KEY UPDATE password = ?, try = 0`,
            [1, username, hashedPassword, hashedPassword] // accountId=1 temporal
        );

        //console.log('✅ Usuario creado/actualizado correctamente');
        //console.log(`Usuario: ${username}`);
        //console.log(`Contraseña cifrada: ${hashedPassword}`);

    } catch (error) {
        //console.log('❌ Error:' + error.message);
    }
}

hashPassword();