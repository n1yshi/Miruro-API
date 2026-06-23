export class CryptoUtils {
  static async sha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return CryptoUtils.bufferToHex(hash);
  }

  static async hmacSHA256(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
    return CryptoUtils.bufferToHex(signature);
  }

  static async aesEncrypt(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(data)
    );
    const encBuf = encrypted as ArrayBuffer;
    const combined = new Uint8Array(iv.length + encBuf.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encBuf), iv.length);
    return CryptoUtils.bufferToBase64(combined);
  }

  static async aesDecrypt(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const combined = CryptoUtils.base64ToBuffer(data);
    const iv = combined.slice(0, 12).buffer as ArrayBuffer;
    const encrypted = combined.slice(12).buffer as ArrayBuffer;
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  }

  static bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  static randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  static randomHex(length: number): string {
    return CryptoUtils.bufferToHex(CryptoUtils.randomBytes(Math.ceil(length / 2))).slice(0, length);
  }

  static uuid(): string {
    return crypto.randomUUID();
  }

  static async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    const pubKey = await crypto.subtle.exportKey('raw', keyPair.publicKey!) as ArrayBuffer;
    const privKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey!) as ArrayBuffer;
    return {
      publicKey: CryptoUtils.bufferToBase64(new Uint8Array(pubKey)),
      privateKey: CryptoUtils.bufferToBase64(new Uint8Array(privKey))
    };
  }

  static async sign(data: string, privateKeyBase64: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyBuffer = CryptoUtils.base64ToBuffer(privateKeyBase64).buffer as ArrayBuffer;
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      encoder.encode(data)
    ) as ArrayBuffer;
    return CryptoUtils.bufferToBase64(new Uint8Array(signature));
  }
}
