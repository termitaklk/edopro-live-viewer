const assert = require('assert');
const { _test: connTest } = require('../tcp-conexion/conexion');

function buildStocErrorSegment(errorType, errorCode) {
    const payloadLength = 1 + 1 + 4; // stoc type + errorType + errorCode
    const segment = Buffer.alloc(2 + payloadLength);
    segment.writeUInt16LE(payloadLength, 0);
    segment.writeUInt8(0x02, 2); // STOC_ERROR_MSG
    segment.writeUInt8(errorType >>> 0, 3);
    segment.writeUInt32LE(errorCode >>> 0, 4);
    return segment;
}

function testJoinErrorMappings() {
    const wrongPassword = connTest.parseStocErrorSegment(buildStocErrorSegment(0x01, 1));
    assert.ok(wrongPassword, 'Wrong password STOC_ERROR should be parsed');
    assert.strictEqual(wrongPassword.errorKey, 'ROOM_PASSWORD_INVALID');
    assert.strictEqual(wrongPassword.joinErrorName, 'JERR_PASSWORD');

    const joinUnable = connTest.parseStocErrorSegment(buildStocErrorSegment(0x01, 0));
    assert.ok(joinUnable, 'Join unable STOC_ERROR should be parsed');
    assert.strictEqual(joinUnable.errorKey, 'ROOM_JOIN_UNABLE');
    assert.strictEqual(joinUnable.joinErrorName, 'JERR_UNABLE');

    const joinRefused = connTest.parseStocErrorSegment(buildStocErrorSegment(0x01, 2));
    assert.ok(joinRefused, 'Join refused STOC_ERROR should be parsed');
    assert.strictEqual(joinRefused.errorKey, 'ROOM_JOIN_REFUSED');
    assert.strictEqual(joinRefused.joinErrorName, 'JERR_REFUSED');
}

function testHandshakeSuccessTypes() {
    const successTypes = connTest.HANDSHAKE_SUCCESS_STOC_TYPES;
    assert.ok(successTypes instanceof Set, 'Handshake success types must be a Set');
    assert.ok(successTypes.has(0x12), 'STOC_JOIN_GAME must unlock handshake');
    assert.ok(successTypes.has(0x20), 'STOC_HS_PLAYER_ENTER must unlock handshake');
    assert.ok(successTypes.has(0x21), 'STOC_HS_PLAYER_CHANGE must unlock handshake');
    assert.ok(successTypes.has(0x22), 'STOC_HS_WATCH_CHANGE must unlock handshake');
    assert.ok(!successTypes.has(0x02), 'STOC_ERROR_MSG must never be considered a success handshake packet');
}

function run() {
    testJoinErrorMappings();
    testHandshakeSuccessTypes();
    console.log('visor-room-password-guard.test.js: OK');
}

run();
