import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // JWT_SECRET ko base banakar 32-byte key banao
    const secret = this.configService.get<string>('JWT_SECRET')!;
    this.key = crypto.scryptSync(secret, 'naukri-session-salt', 32);
  }

  // ═══════════════════════════════════════
  // ENCRYPT — Cookies ko encrypt karo
  // ═══════════════════════════════════════
  encrypt(plainText: string): { encrypted: string; iv: string } {
    // Har baar naya IV (Initialization Vector)
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Auth tag — tampering detect karne ke liye
    const authTag = cipher.getAuthTag();

    // encrypted + authTag dono store karo
    const combined = encrypted + ':' + authTag.toString('hex');

    return {
      encrypted: combined,
      iv: iv.toString('hex'),
    };
  }

  // ═══════════════════════════════════════
  // DECRYPT — Cookies wapas lao
  // ═══════════════════════════════════════
  decrypt(encryptedText: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');

    // Split encrypted data and auth tag
    const [encrypted, authTagHex] = encryptedText.split(':');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
