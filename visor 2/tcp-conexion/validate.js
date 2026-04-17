const STOC_MSG = require('../messages/STOC_MSG');

// Función para invertir el mapeo de CTOS_MSG
function invertObject(obj) {
    const inverted = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            inverted[obj[key]] = key;
        }
    }
    return inverted;
}

const invertedSTOC_MSG = invertObject(STOC_MSG);

function validateMessageSegment(hexMessage) {
    // Convertir los primeros dos bytes a little endian
    const lengthBytes = hexMessage.substring(0, 4); // primeros 4 caracteres hexadecimales
    const littleEndianLength = lengthBytes.match(/../g).reverse().join(''); // reverso para little endian
    const expectedLength = parseInt(littleEndianLength, 16); // convertimos a decimal

    // Calcular la longitud real del mensaje restante en bytes
    const remainingMessage = hexMessage.substring(4); // quitamos los primeros 2 bytes (4 caracteres hexadecimales)
    const actualLength = remainingMessage.length / 2; // longitud en bytes

    // Verificar si la longitud esperada coincide con la longitud actual
    const isValid = expectedLength === actualLength;

    // Obtener el tipo de mensaje (tercer byte)
    const messageTypeHex = hexMessage.substring(4, 6);
    const messageType = parseInt(messageTypeHex, 16);
    const messageName = invertedSTOC_MSG[messageType] || "Unknown Message Type";

    return {
        expectedLength,
        actualLength,
        isValid,
        messageType,
        messageName
    };
}

function processMessages(hexMessage) {
    let offset = 0;
    const results = [];

    while (offset < hexMessage.length) {
        // Obtener la longitud esperada del segmento
        const lengthBytes = hexMessage.substring(offset, offset + 4); // primeros 4 caracteres hexadecimales
        const littleEndianLength = lengthBytes.match(/../g).reverse().join(''); // reverso para little endian
        const segmentLength = parseInt(littleEndianLength, 16) * 2; // convertimos a decimal y multiplicamos por 2 para obtener la longitud en caracteres hexadecimales
        
        // Obtener el segmento completo incluyendo la longitud
        const segment = hexMessage.substring(offset, offset + 4 + segmentLength);

        // Validar el segmento del mensaje
        const validation = validateMessageSegment(segment);
        results.push({
            segment,
            ...validation
        });

        // Mover el offset al siguiente segmento
        offset += 4 + segmentLength;
    }

    return results;
}

module.exports = { validateMessageSegment, processMessages };



