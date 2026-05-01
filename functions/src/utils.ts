import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 */
export function ensureAdminInitialized() {
  if (getApps().length === 0) {
    initializeApp();
  }
}

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

/**
 * Sets standard CORS headers for Cloud Functions.
 * 
 * @param request - The incoming request
 * @param response - The outgoing response
 */
export function applyCors(request: Request, response: Response): boolean {
  const origin = request.headers.origin || '';
  const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isProduction = 
    origin === FRONTEND_ORIGIN || 
    origin.endsWith('.web.app') || 
    origin.endsWith('.firebaseapp.com') ||
    origin.endsWith('.run.app');

  const allowedOrigin = (isLocalhost || isProduction) ? origin : FRONTEND_ORIGIN;
  
  response.set('Access-Control-Allow-Origin', allowedOrigin);
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return true; // Request handled
  }
  return false; // Request not handled, continue
}

/**
 * Validates that the request method is POST.
 */
export function validateMethod(request: Request, response: Response): boolean {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return false;
  }
  return true;
}

/**
 * Extracts the client IP from the request.
 */
export function getClientIp(request: Request): string {
  return request.ip || 'unknown';
}

/**
 * Validates that the Content-Type is application/json.
 */
export function validateContentType(request: Request, response: Response): boolean {
  const contentType = request.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    response.status(415).json({
      error: 'Content-Type must be application/json',
      code: 'INVALID_CONTENT_TYPE',
    });
    return false;
  }
  return true;
}
