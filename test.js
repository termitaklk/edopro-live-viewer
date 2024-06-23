// Función para convertir una cadena hexadecimal a un buffer
function hexStringToBuffer(hexString) {
    const length = hexString.length / 2;
    const buffer = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
        buffer[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return buffer;
}

// Función para validar la integridad del mensaje
function validateMessage(messageBuffer) {
    // Leer los primeros 2 bytes y convertirlos a little-endian
    const lengthBytes = messageBuffer.slice(0, 2);
    const messageLength = lengthBytes.readUInt16LE(0);

    // La longitud esperada de la data restante del mensaje
    const expectedLength = (messageBuffer.length - 2) * 2;

    // Validar la longitud
    return messageLength === expectedLength;
}

// Ejemplo de uso con el mensaje dado
const exampleMessageHex = '05001801006000';
const exampleMessageBuffer = hexStringToBuffer(exampleMessageHex);
const isValid = validateMessage(exampleMessageBuffer);

console.log(`El mensaje es ${isValid ? 'válido' : 'inválido'}.`);
