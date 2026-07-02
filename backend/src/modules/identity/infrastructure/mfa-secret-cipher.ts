import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Encrypts MFA TOTP secrets at rest (AES-256-GCM) per spec.md ("secreto por usuario
 * cifrado en reposo"). Format: "<iv>:<authTag>:<ciphertext>", all hex-encoded.
 */
@Injectable()
export class MfaSecretCipher {
  constructor(private readonly config: ConfigService) {}

  private key(): Buffer {
    return Buffer.from(this.config.get<string>('MFA_ENCRYPTION_KEY', ''), 'hex');
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, encrypted].map((buffer) => buffer.toString('hex')).join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, dataHex] = payload.split(':');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }
}
