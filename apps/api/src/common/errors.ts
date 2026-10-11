/**
 * Centralized error class — PRD §66, §78
 *
 * Standardized error handling with HTTP status codes and machine-readable error codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends BadRequestError {
  public readonly errors: Array<{ field?: string; message: string }>;

  constructor(errors: Array<{ field?: string; message: string }> | string) {
    if (typeof errors === 'string') {
      super(errors, 'VALIDATION_ERROR');
      this.errors = [{ message: errors }];
    } else {
      super('Validation failed', 'VALIDATION_ERROR');
      this.errors = errors;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR') {
    super(message, 500, code);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrivateFileUploadsDisabledError extends BadRequestError {
  constructor(
    message = 'Private document and file uploads are disabled during the controlled beta phase.'
  ) {
    super(message, 'PRIVATE_FILE_UPLOADS_DISABLED');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const AuthenticationError = UnauthorizedError;
export type AuthenticationError = UnauthorizedError;
