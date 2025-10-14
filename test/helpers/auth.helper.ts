import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '@modules/auth/types';

export class AuthHelper {
  private static jwtService: JwtService;
  private static configService: ConfigService;

  static initialize(jwtService: JwtService, configService: ConfigService) {
    this.jwtService = jwtService;
    this.configService = configService;
  }

  static generateAccessToken(userId: string): string {
    if (!this.jwtService) {
      throw new Error('AuthHelper not initialized. Call initialize() first.');
    }

    return this.jwtService.sign(
      { id: userId, tokenType: TokenType.USER },
      { secret: this.configService.get('JWT_SECRET') }
    );
  }

  static generateRefreshToken(userId: string): string {
    if (!this.jwtService) {
      throw new Error('AuthHelper not initialized. Call initialize() first.');
    }

    return this.jwtService.sign(
      { id: userId, tokenType: TokenType.REFRESH },
      { secret: this.configService.get('JWT_REFRESH_SECRET') }
    );
  }

  static generateSignUpToken(userId: string): string {
    if (!this.jwtService) {
      throw new Error('AuthHelper not initialized. Call initialize() first.');
    }

    return this.jwtService.sign(
      { id: userId, tokenType: TokenType.SIGN_UP },
      { secret: this.configService.get('JWT_SIGN_UP_SECRET') }
    );
  }

  static generateExpiredToken(userId: string): string {
    if (!this.jwtService) {
      throw new Error('AuthHelper not initialized. Call initialize() first.');
    }

    return this.jwtService.sign(
      { id: userId, tokenType: TokenType.USER },
      { 
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '-1h' // Expired 1 hour ago
      }
    );
  }

  static generateInvalidToken(): string {
    return 'invalid.jwt.token';
  }

  static generateMalformedToken(): string {
    return 'Bearer invalid-token-format';
  }

  static getAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static getBasicAuthHeaders(username: string, password: string): Record<string, string> {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }
}
