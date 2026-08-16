import { HttpException } from '@nestjs/common';

export class AuthError extends HttpException {
  public readonly code: string;

  constructor(code: string, statusCode: number, message: string) {
    super(message, statusCode);
    this.code = code;
  }
}
