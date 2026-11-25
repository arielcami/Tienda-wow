// soapClient.js - Ejecuta comandos de GM en el worldserver de AzerothCore vía SOAP.
// Requiere en worldserver.conf: SOAP.Enabled = 1, SOAP.IP, SOAP.Port
// y en .env: SOAP_USER / SOAP_PASSWORD (cuenta GM nivel 3 dedicada a la tienda).

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SOAP_HOST = process.env.SOAP_HOST || '127.0.0.1';
const SOAP_PORT = process.env.SOAP_PORT || 7878;
const SOAP_USER = process.env.SOAP_USER;
const SOAP_PASSWORD = process.env.SOAP_PASSWORD;

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Los textos del comando van entre comillas dobles: se quitan comillas y saltos de línea
export function sanitizeCommandText(text) {
    return String(text).replace(/["\r\n]/g, ' ').trim();
}

/**
 * Ejecuta un comando en el worldserver y devuelve el texto de respuesta.
 * Lanza un error si el servidor no responde o rechaza el comando.
 */
export async function executeCommand(command) {
    if (!SOAP_USER || !SOAP_PASSWORD) {
        throw new Error('SOAP no configurado: faltan SOAP_USER / SOAP_PASSWORD en .env');
    }

    const envelope =
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
        'xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" ' +
        'xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance" ' +
        'xmlns:xsd="http://www.w3.org/1999/XMLSchema" xmlns:ns1="urn:AC">' +
        '<SOAP-ENV:Body><ns1:executeCommand>' +
        `<command>${escapeXml(command)}</command>` +
        '</ns1:executeCommand></SOAP-ENV:Body></SOAP-ENV:Envelope>';

    let response;
    try {
        response = await axios.post(`http://${SOAP_HOST}:${SOAP_PORT}/`, envelope, {
            auth: { username: SOAP_USER, password: SOAP_PASSWORD },
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
            timeout: 10000,
            validateStatus: () => true
        });
    } catch (error) {
        throw new Error(`No se pudo conectar con el worldserver (SOAP): ${error.message}`);
    }

    const body = String(response.data || '');

    if (response.status === 401) {
        throw new Error('SOAP: usuario o contraseña incorrectos, o la cuenta no es GM nivel 3');
    }

    const fault = body.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
    if (fault || response.status >= 400) {
        const detail = fault ? fault[1].trim() : `HTTP ${response.status}`;
        throw new Error(`El worldserver rechazó el comando: ${detail}`);
    }

    const result = body.match(/<result>([\s\S]*?)<\/result>/);
    return result ? result[1].trim() : '';
}

/**
 * Envía un ítem por correo dentro del juego. El worldserver asigna los GUID,
 * así que funciona aunque el personaje esté conectado y no corrompe inventarios.
 */
export async function sendItemsByMail(characterName, subject, body, itemId, count = 1) {
    const name = sanitizeCommandText(characterName);
    if (!/^[^\s"]+$/.test(name)) {
        throw new Error('Nombre de personaje inválido');
    }
    const id = parseInt(itemId, 10);
    const qty = parseInt(count, 10);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(qty) || qty <= 0) {
        throw new Error('Item o cantidad inválidos');
    }

    return executeCommand(
        `.send items ${name} "${sanitizeCommandText(subject)}" "${sanitizeCommandText(body)}" ${id}:${qty}`
    );
}
