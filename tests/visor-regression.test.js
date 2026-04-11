const assert = require('assert');
const { _test: wsTest } = require('../tcp-conexion/websocket');
const { _test: msgTest } = require('../messageshandler/messageHandlers');

function u32(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value >>> 0, 0);
    return buffer;
}

function makeStocErrorSegment(errorType, errorCode) {
    const payloadLength = 1 + 1 + 4; // type + errorType + errorCode
    const segment = Buffer.alloc(2 + payloadLength);
    segment.writeUInt16LE(payloadLength, 0);
    segment.writeUInt8(0x02, 2); // STOC_ERROR_MSG
    segment.writeUInt8(errorType >>> 0, 3);
    segment.writeUInt32LE(errorCode >>> 0, 4);
    return segment;
}

function testFieldSlotMapping() {
    assert.strictEqual(wsTest.getFieldSlotByController(0, 0), 5, 'Top side seq0 should map to slot 5');
    assert.strictEqual(wsTest.getFieldSlotByController(0, 4), 1, 'Top side seq4 should map to slot 1');
    assert.strictEqual(wsTest.getFieldSlotByController(1, 0), 1, 'Bottom side seq0 should map to slot 1');
    assert.strictEqual(wsTest.getFieldSlotByController(1, 4), 5, 'Bottom side seq4 should map to slot 5');

    assert.strictEqual(wsTest.getFieldCellKey(0, 0x04, 0), 'b5', 'Top MZONE seq0 -> b5');
    assert.strictEqual(wsTest.getFieldCellKey(0, 0x08, 4), 'a1', 'Top SZONE seq4 -> a1');
    assert.strictEqual(wsTest.getFieldCellKey(1, 0x04, 0), 'd1', 'Bottom MZONE seq0 -> d1');
    assert.strictEqual(wsTest.getFieldCellKey(1, 0x08, 4), 'c5', 'Bottom SZONE seq4 -> c5');
}

function testMoveParserByFlow() {
    // EDOPro compact format
    const compactPayload = Buffer.concat([
        u32(0x01020304),              // code
        Buffer.from([1, 0x04, 1, 0x01]), // prev: ctrl, loc, seq, pos
        Buffer.from([1, 0x10, 0, 0x00]), // curr: ctrl, loc, seq, pos
        u32(0x40),                    // reason
    ]);
    const compact = msgTest.parseMovePayload(compactPayload, 'edopro');
    assert.ok(compact, 'Compact parser should decode edopro payload');
    assert.strictEqual(compact.parserVariant, 'compact');
    assert.strictEqual(compact.previousController, 1);
    assert.strictEqual(compact.previousLocation, 0x04);
    assert.strictEqual(compact.previousSequence, 1);
    assert.strictEqual(compact.currentLocation, 0x10);

    // Mercury extended format
    const extendedPayload = Buffer.concat([
        u32(0x0a0b0c0d),              // code
        Buffer.from([0, 0x04]),       // prev ctrl, loc
        u32(3),                       // prev seq
        u32(0x01),                    // prev pos
        Buffer.from([0, 0x10]),       // curr ctrl, loc
        u32(0),                       // curr seq
        u32(0x00),                    // curr pos
        u32(0x20),                    // reason
    ]);
    const extended = msgTest.parseMovePayload(extendedPayload, 'mercury');
    assert.ok(extended, 'Extended parser should decode mercury payload');
    assert.strictEqual(extended.parserVariant, 'extended');
    assert.strictEqual(extended.previousController, 0);
    assert.strictEqual(extended.previousLocation, 0x04);
    assert.strictEqual(extended.previousSequence, 3);
    assert.strictEqual(extended.currentLocation, 0x10);
}

function testStocErrorParser() {
    const wrongPasswordSegment = makeStocErrorSegment(0x01, 1);
    const parsedWrongPassword = msgTest.parseErrorPayload(wrongPasswordSegment);
    assert.ok(parsedWrongPassword, 'STOC_ERROR parser should decode payload');
    assert.strictEqual(parsedWrongPassword.errorTypeName, 'JOINERROR');
    assert.strictEqual(parsedWrongPassword.joinErrorName, 'JERR_PASSWORD');

    const joinRefusedSegment = makeStocErrorSegment(0x01, 2);
    const parsedJoinRefused = msgTest.parseErrorPayload(joinRefusedSegment);
    assert.ok(parsedJoinRefused, 'STOC_ERROR parser should decode join refused payload');
    assert.strictEqual(parsedJoinRefused.joinErrorName, 'JERR_REFUSED');
}

function run() {
    testFieldSlotMapping();
    testMoveParserByFlow();
    testStocErrorParser();
    console.log('visor-regression.test.js: OK');
}

run();
