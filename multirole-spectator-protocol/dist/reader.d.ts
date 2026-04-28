import { CardLocation } from "./types";
export declare class Reader {
    private readonly buf;
    offset: number;
    constructor(buf: Buffer, offset?: number);
    remaining(): number;
    u8(): number;
    u16(): number;
    u32(): number;
    rest(): Buffer;
    bytes(length: number): Buffer;
    location(): CardLocation;
    utf16Fixed(chars: number): string;
    private ensure;
}
