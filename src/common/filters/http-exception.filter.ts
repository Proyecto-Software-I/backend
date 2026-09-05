import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthError } from '../exceptions/auth-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (exception instanceof AuthError) {
      statusCode = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const parsed = body as Record<string, unknown>;
        const msg = parsed['message'];

        message = Array.isArray(msg)
          ? msg.join(', ')
          : typeof msg === 'string'
            ? msg
            : exception.message;
      }

      code = this.codeForStatus(statusCode);
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      if (exception instanceof Error) {
        this.logger.error(
          `${req.method} ${req.originalUrl} -> ${statusCode} ${code}: ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.error(
          `${req.method} ${req.originalUrl} -> ${statusCode} ${code}`,
          String(exception),
        );
      }
    }

    res.status(statusCode).json({ statusCode, code, message });
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 409:
        return 'CONFLICT';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}