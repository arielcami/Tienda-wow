// srp6Util.js - Traducción exacta del algoritmo SRP6 de Java a JavaScript
// Basado en: pe.com.webaccounts.util.Srp6Util

import crypto from 'crypto';

// Constantes exactas del Java
const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7');
const g = BigInt(7);

/**
 * Calcula el verifier SRP6 (traducción exacta del Java)
 * @param {string} username - Nombre de usuario en MAYÚSCULAS
 * @param {string} password - Contraseña en MAYÚSCULAS  
 * @param {Buffer} salt - Salt de 32 bytes
 * @returns {Buffer} - Verifier de 32 bytes en little-endian
 */
export function calculateVerifier(username, password, salt) {
    try {
        // 1. Calcular h1 = SHA1(username + ":" + password)
        // Nota: En Java se usa UTF-8, igual que aquí
        const userPass = `${username}:${password}`;
        const h1 = crypto.createHash('sha1')
            .update(userPass, 'utf-8')
            .digest();

        // 2. Calcular h2 = SHA1(salt || h1)
        // Nota: sha1.update(salt); sha1.update(h1); en Java
        const h2 = crypto.createHash('sha1')
            .update(Buffer.concat([salt, h1]))
            .digest();

        // 3. Interpretar h2 como un número entero en little-endian (GMP_LSW_FIRST)
        const h2Int = littleEndianToBigInteger(h2);

        // 4. Calcular verifier = g^h2 mod N
        const verifier = modPow(g, h2Int, N);

        // 5. Exportar verifier a bytes en little-endian y asegurarse que tenga 32 bytes
        const verifierBytes = bigIntegerToLittleEndian(verifier, 32);

        return verifierBytes;

    } catch (error) {
        throw new Error(`Error calculando verifier SRP6: ${error.message}`);
    }
}

/**
 * Convierte un arreglo little-endian a BigInteger (traducción del Java)
 * Java: private static BigInteger littleEndianToBigInteger(byte[] leBytes)
 * @param {Buffer} leBytes - Buffer en little-endian
 * @returns {BigInt} - BigInt resultante
 */
function littleEndianToBigInteger(leBytes) {
    // En Java: byte[] beBytes = new byte[leBytes.length];
    //          for (int i = 0; i < leBytes.length; i++) {
    //              beBytes[i] = leBytes[leBytes.length - 1 - i];
    //          }
    //          return new BigInteger(1, beBytes);

    // Crear una copia en big-endian invirtiendo el orden
    const beBytes = Buffer.from(leBytes).reverse();

    // Convertir a BigInt (el segundo parámetro 0 asegura que sea positivo)
    // new BigInteger(1, beBytes) en Java crea un BigInteger positivo
    return BigInt('0x' + beBytes.toString('hex'));
}

/**
 * Convierte BigInteger a un arreglo little-endian de tamaño fijo
 * Java: private static byte[] bigIntegerToLittleEndian(BigInteger value, int length)
 * @param {BigInt} value - Valor BigInt
 * @param {number} length - Longitud deseada en bytes
 * @returns {Buffer} - Buffer little-endian
 */
function bigIntegerToLittleEndian(value, length) {
    // En Java: byte[] beBytes = value.toByteArray();

    // Convertir a hexadecimal (equivalente a toByteArray())
    let hex = value.toString(16);

    // Asegurar longitud par
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }

    // Convertir a Buffer big-endian
    let beBytes = Buffer.from(hex, 'hex');

    // Java: Si tiene un byte extra inicial 0, lo quitamos
    // if (beBytes.length > 1 && beBytes[0] == 0) {
    //     byte[] tmp = new byte[beBytes.length - 1];
    //     System.arraycopy(beBytes, 1, tmp, 0, tmp.length);
    //     beBytes = tmp;
    // }

    if (beBytes.length > 1 && beBytes[0] === 0) {
        beBytes = beBytes.slice(1);
    }

    // Crear Buffer para little-endian
    // Java: byte[] leBytes = new byte[length];
    const leBytes = Buffer.alloc(length);

    // Java: for (int i = 0; i < beBytes.length && i < length; i++) {
    //          leBytes[i] = beBytes[beBytes.length - 1 - i];
    //       }

    // Copiar invertido (big-endian a little-endian)
    const copyLength = Math.min(beBytes.length, length);
    for (let i = 0; i < copyLength; i++) {
        leBytes[i] = beBytes[beBytes.length - 1 - i];
    }

    // Java: Si leBytes es más largo, ya está relleno con ceros a la derecha
    // (Buffer.alloc ya inicializa con ceros)

    return leBytes;
}

/**
 * Exponenciación modular (equivalente a BigInteger.modPow en Java)
 * Java: BigInteger verifier = g.modPow(h2Int, N);
 * @param {BigInt} base - Base
 * @param {BigInt} exponent - Exponente
 * @param {BigInt} modulus - Módulo
 * @returns {BigInt} - (base^exponent) mod modulus
 */
function modPow(base, exponent, modulus) {
    // Implementación de exponenciación modular binaria
    // Más eficiente para números grandes que la implementación simple

    if (modulus === BigInt(1)) return BigInt(0);

    let result = BigInt(1);
    let b = base % modulus;
    let e = exponent;

    while (e > 0) {
        // Si el bit menos significativo es 1
        if (e & BigInt(1)) {
            result = (result * b) % modulus;
        }
        // Desplazar a la derecha (dividir entre 2)
        e = e >> BigInt(1);
        // b = b^2 mod modulus
        b = (b * b) % modulus;
    }

    return result;
}

/**
 * Función auxiliar para convertir Buffer a string hexadecimal (para debugging)
 * @param {Buffer} buffer - Buffer a convertir
 * @returns {string} - Representación hexadecimal
 */
export function bufferToHex(buffer) {
    return buffer.toString('hex');
}

/**
 * Función auxiliar para convertir hexadecimal a Buffer
 * @param {string} hex - String hexadecimal
 * @returns {Buffer} - Buffer resultante
 */
export function hexToBuffer(hex) {
    return Buffer.from(hex, 'hex');
}

// Para pruebas y compatibilidad
export default {
    calculateVerifier,
    bufferToHex,
    hexToBuffer,
    N,
    g
};  