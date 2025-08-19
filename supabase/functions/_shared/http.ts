// VERSIÓN FINAL Y CORREGIDA: Se define CORS_HEADERS localmente para eliminar dependencias.
// Se añade 'content-type' a los headers permitidos y se manejan las peticiones OPTIONS.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Definición local de los headers para eliminar dependencias
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Creates a standard API HTTP response.
 * @param req - The incoming request object.
 * @param handler - The function to execute for non-OPTIONS requests.
 */
export async function createApiHttpResponse(
  req: Request,
  handler: (req: Request) => Promise<Response>
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Se asume que el handler ya incluirá los CORS_HEADERS en su respuesta exitosa.
    return await handler(req);
  } catch (error) {
    console.error(error);
    const errorResponse = {
      message: error.message || 'An unexpected error occurred.',
      stack: error.stack,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

/**
 * Wraps an Edge Function handler with common logic.
 * @param handler - The core logic of the Edge Function.
 */
export function serveWithOptions(handler: (req: Request) => Promise<Response>) {
  serve(async (req) => {
    return await createApiHttpResponse(req, handler);
  });
}