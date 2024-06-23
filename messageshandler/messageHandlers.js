const STOC_MSG = require('../messages/STOC_MSG');
const messageSchema = require('./messageSchema');

const messageHandlers = {
    [STOC_MSG.STOC_TYPE_CHANGE]: handleTypeChange,
    // Agrega aquí el resto de los manejadores de mensajes...
};

function readValue(buffer, start, length, type) {
    if (buffer.length < start + length) {
        throw new RangeError(`El buffer es demasiado pequeño para leer ${type} desde el offset ${start}`);
    }

    switch (type) {
        case 'UInt32LE':
            return buffer.readUInt32LE(start);
        case 'UInt16LE':
            return buffer.readUInt16LE(start);
        case 'UInt8':
            return buffer.readUInt8(start);
        case 'Buffer':
            return buffer.slice(start, start + length).toString('hex');
        case 'BufferLE':
            return buffer.slice(start, start + length).reverse().toString('hex');
        default:
            throw new Error(`Unknown type: ${type}`);
    }
}

function parseMessage(segment, schema) {
    let buffer = Buffer.from(segment, 'hex');
    console.log('Buffer (hex):', buffer.toString('hex')); // Imprimir el buffer en hexadecimal
    let result = {};
    for (let field in schema) {
        const { start, length, type } = schema[field];
        result[field] = readValue(buffer, start, length, type);
    }
    return result;
}

function handleTypeChange(segment) {
    try {
        const parsedMessage = parseMessage(segment, messageSchema.STOC_TYPE_CHANGE);
        console.log("Handling STOC_TYPE_CHANGE:");
        console.log(`Longitud: ${parsedMessage.longitud}`);
        console.log(`Comando: ${parsedMessage.comando}`);
        console.log(`Player1: ${Buffer.from(parsedMessage.player1, 'hex').reverse().toString()}`);
        console.log(`Position1: ${parsedMessage.positionp1}`);
        console.log(`Player2: ${Buffer.from(parsedMessage.player2, 'hex').reverse().toString()}`);
        console.log(`Position2: ${parsedMessage.positionp2}`);
    } catch (error) {
        console.error("Error handling STOC_TYPE_CHANGE:", error);
    }
}

module.exports = messageHandlers;

