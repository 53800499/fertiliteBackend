import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: any = 'Une erreur interne est survenue sur le serveur.';
    let error = 'Internal Server Error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      message = respObj.message || message;
      error = respObj.error || error;
      code = respObj.code || this.mapStatusCodeToCode(status);
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      code = this.mapStatusCodeToCode(status);
    } else {
      code = this.mapStatusCodeToCode(status);
    }

    // Journalisation sans fuite de données de santé ou sensibles
    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Code: ${code}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      code,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapStatusCodeToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_OR_BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
