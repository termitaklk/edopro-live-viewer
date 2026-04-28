"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reader = void 0;
class Reader {
    constructor(buf, offset = 0) {
        this.buf = buf;
        this.offset = offset;
    }
    remaining() {
        return this.buf.length - this.offset;
    }
    u8() {
        this.ensure(1);
        return this.buf.readUInt8(this.offset++);
    }
    u16() {
        this.ensure(2);
        const v = this.buf.readUInt16LE(this.offset);
        this.offset += 2;
        return v;
    }
    u32() {
        this.ensure(4);
        const v = this.buf.readUInt32LE(this.offset);
        this.offset += 4;
        return v;
    }
    rest() {
        const out = this.buf.subarray(this.offset);
        this.offset = this.buf.length;
        return out;
    }
    bytes(length) {
        this.ensure(length);
        const out = this.buf.subarray(this.offset, this.offset + length);
        this.offset += length;
        return out;
    }
    location() {
        return {
            controller: this.u8(),
            location: this.u8(),
            sequence: this.u8(),
            position: this.u8(),
        };
    }
    utf16Fixed(chars) {
        const raw = this.bytes(chars * 2);
        for (let i = 0; i + 1 < raw.length; i += 2) {
            if (raw[i] === 0 && raw[i + 1] === 0) {
                return raw.subarray(0, i).toString("utf16le");
            }
        }
        return raw.toString("utf16le");
    }
    ensure(size) {
        if (this.offset + size > this.buf.length) {
            throw new RangeError("Buffer too small");
        }
    }
}
exports.Reader = Reader;
