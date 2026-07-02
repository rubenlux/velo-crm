import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id hashing per research.md #1 (OWASP-recommended parameters).
 */
@Injectable()
export class PasswordHasher {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MiB
    timeCost: 2,
    parallelism: 1,
  };

  hash(plainTextPassword: string): Promise<string> {
    return argon2.hash(plainTextPassword, this.options);
  }

  verify(hash: string, plainTextPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainTextPassword);
  }
}
