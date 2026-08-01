import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorBody {
  success: false;
  message: string;
  errors?: unknown[];
  timestamp: string;
}

/**
 * Produces the consistent error envelope defined in docs/03-backend.md, and
 * makes sure internal detail never reaches a client.
 *
 * An unexpected exception is logged with its stack and returned as a generic
 * 500. Leaking a stack trace or a driver error message hands an attacker the
 * schema.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorBody = {
      success: false,
      message: "An unexpected error occurred.",
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        body.message = payload;
      } else if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        body.message =
          typeof record["message"] === "string"
            ? record["message"]
            : exception.message;
        if (Array.isArray(record["errors"])) {
          body.errors = record["errors"];
        }
      }
    } else {
      /* Unexpected — log everything internally, disclose nothing. */
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}
