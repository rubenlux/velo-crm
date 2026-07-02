export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super('Invalid or expired token');
    this.name = 'InvalidOrExpiredTokenError';
  }
}

export class OAuthOnlyAccountError extends Error {
  constructor() {
    super('This account uses an external identity provider and has no password');
    this.name = 'OAuthOnlyAccountError';
  }
}
