import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/library';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input',
      issues: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'CONFLICT', message: 'Record already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
      return;
    }
    console.error('[Prisma] Known error:', err.code, err.message);
    res.status(500).json({ error: 'DB_ERROR', message: `Database error: ${err.code}` });
    return;
  }

  if (err instanceof PrismaClientInitializationError) {
    console.error('[Prisma] Initialization error:', err.message);
    res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database connection failed' });
    return;
  }

  if (err instanceof PrismaClientRustPanicError) {
    console.error('[Prisma] Rust panic:', err.message);
    res.status(500).json({ error: 'DB_PANIC', message: 'Database engine error' });
    return;
  }

  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
}
