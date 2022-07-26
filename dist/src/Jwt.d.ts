/// <reference types="node" />
export declare function base64Encode(value: Buffer | string | any): string;
export declare function hmacSign(algorithm: string, secret: string, data: string): Buffer;
export declare function hs256(payload: any, secret: string): string;
