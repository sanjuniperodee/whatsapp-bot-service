export function encodeBase64(payload: any): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeBase64<T = any>(payload: string): T {
  return JSON.parse(Buffer.from(payload, 'base64').toString()) as T;
}
