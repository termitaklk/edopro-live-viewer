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

function ensureBuffer(message) {
    if (Buffer.isBuffer(message)) {
        return message;
    }
    if (typeof message === 'string') {
        return Buffer.from(message, 'hex');
    }
    return Buffer.alloc(0);
}

function getSegmentLengthFromHex(hexMessage, offset = 0) {
    if (!hexMessage || hexMessage.length < offset + 4) {
        return null;
    }

    const lengthBytes = hexMessage.substring(offset, offset + 4);
    const bytePairs = lengthBytes.match(/../g);
    if (!bytePairs || bytePairs.length !== 2) {
        return null;
    }

    const littleEndianLength = bytePairs.reverse().join('');
    const expectedLength = parseInt(littleEndianLength, 16);
    if (Number.isNaN(expectedLength)) {
        return null;
    }

    return expectedLength * 2;
}

function getSegmentLengthFromBuffer(buffer, offset = 0) {
    const data = ensureBuffer(buffer);
    if (!data || data.length < offset + 2) {
        return null;
    }

    return data.readUInt16LE(offset);
}

function validateMessageSegment(hexMessage) {
    if (Buffer.isBuffer(hexMessage)) {
        return validateMessageBuffer(hexMessage);
    }
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

function validateMessageBuffer(bufferInput) {
    const buffer = ensureBuffer(bufferInput);
    if (buffer.length < 3) {
        return {
            expectedLength: 0,
            actualLength: Math.max(0, buffer.length - 2),
            isValid: false,
            messageType: null,
            messageName: "Unknown Message Type",
        };
    }

    const expectedLength = buffer.readUInt16LE(0);
    const actualLength = Math.max(0, buffer.length - 2);
    const isValid = expectedLength === actualLength;
    const messageType = buffer.readUInt8(2);
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

function processStreamBuffer(hexBuffer) {
    if (Buffer.isBuffer(hexBuffer)) {
        return processStreamBufferBinary(hexBuffer);
    }
    let offset = 0;
    const results = [];

    while (offset + 4 <= hexBuffer.length) {
        const segmentLength = getSegmentLengthFromHex(hexBuffer, offset);
        if (segmentLength === null) {
            break;
        }

        const totalSegmentHexLength = 4 + segmentLength;
        if (offset + totalSegmentHexLength > hexBuffer.length) {
            break;
        }

        const segment = hexBuffer.substring(offset, offset + totalSegmentHexLength);
        const validation = validateMessageSegment(segment);
        results.push({
            segment,
            ...validation
        });

        offset += totalSegmentHexLength;
    }

    return {
        results,
        remainingHex: hexBuffer.substring(offset),
    };
}

function processStreamBufferBinary(bufferInput) {
    const buffer = ensureBuffer(bufferInput);
    let offset = 0;
    const results = [];

    while (offset + 2 <= buffer.length) {
        const segmentLength = getSegmentLengthFromBuffer(buffer, offset);
        if (segmentLength === null) {
            break;
        }

        const totalSegmentLength = 2 + segmentLength;
        if (offset + totalSegmentLength > buffer.length) {
            break;
        }

        const segment = buffer.subarray(offset, offset + totalSegmentLength);
        const validation = validateMessageBuffer(segment);
        results.push({
            segment,
            ...validation
        });

        offset += totalSegmentLength;
    }

    return {
        results,
        remainingHex: buffer.subarray(offset),
    };
}

module.exports = { validateMessageSegment, processMessages, processStreamBuffer };

