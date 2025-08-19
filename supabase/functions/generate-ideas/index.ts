// VERSIÓN MÍNIMA Y AUTOCONTENIDA
// Este archivo no tiene dependencias locales para garantizar su funcionamiento.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo explícito de la petición de inspección CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const mockResponse = {
      success: true,
      data: {
        ticker_symbol: 'MSFT',
        company_name: 'Microsoft Corp.',
        justification: 'CORS fixed. Connection successful.',
        confidence: 0.95
      }
    };

    return new Response(JSON.stringify(mockResponse), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});