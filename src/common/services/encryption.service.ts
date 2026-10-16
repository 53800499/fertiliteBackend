import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'femax-secret-encryption-key-fallback-32b';
    // Dérive une clé 256 bits (32 octets) fixe via SHA-256
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Chiffre un texte en clair avec AES-256-GCM.
   * Format produit : iv:authTag:ciphertext (en hexadécimal)
   */
  encrypt(plainText: string | null | undefined): string | null {
    if (!plainText) return null;
    try {
      const iv = crypto.randomBytes(12); // 96 bits recommandé pour GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch {
      return plainText;
    }
  }

  /**
   * Déchiffre un texte chiffré au format iv:authTag:ciphertext (en hexadécimal).
   * Retourne la chaîne originale si le format n'est pas chiffré (rétrocompatibilité).
   */
  decrypt(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return null;
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        return encryptedText; // Pas au format GCM attendu, on retourne brut
      }
      const [ivHex, authTagHex, cipherHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encryptedText;
    }
  }
}
