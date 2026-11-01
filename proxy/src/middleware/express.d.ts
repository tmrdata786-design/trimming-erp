import 'express';
import type { JWTPayload, UserRole } from './types/index.js';

declare global {
  namespace Express {
    interface Request {
      auth?: JWTPayload;
      validated?: any;
    }
  }
}