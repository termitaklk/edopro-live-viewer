const messageSchema = {
    STOC_TYPE_CHANGE: {
        longitud: { start: 0, length: 2, type: 'UInt16LE' },
        comando: { start: 2, length: 1, type: 'UInt8' },
        player1: { start: 7, length: 20, type: 'BufferLE' },
        positionp1: { start: 47, length: 2, type: 'UInt8' },
        player2: { start: 56, length: 20, type: 'BufferLE' },
        positionp2: { start: 96, length: 2, type: 'UInt8' }
    }
};

module.exports = messageSchema;
