/**
 * Cloudflare Worker — receives encrypted telemetry from VOID TRANSIT browser clients.
 * Stores encrypted blobs in KV storage for later decryption by maintainer.
 *
 * Deploy: wrangler deploy
 * Secrets: GITHUB_TOKEN (for creating gists)
 */

export interface Env {
  GITHUB_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json() as { data: string };
      if (!body.data || typeof body.data !== 'string') {
        return new Response('Missing data', { status: 400, headers: corsHeaders });
      }

      // Validate it's base64
      if (body.data.length > 1_000_000) {
        return new Response('Payload too large', { status: 413, headers: corsHeaders });
      }

      // Store as GitHub Gist
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const gistResponse = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'void-transit-telemetry',
        },
        body: JSON.stringify({
          description: `void-transit-telemetry-${timestamp}`,
          public: false,
          files: {
            [`telemetry-${timestamp}.enc`]: {
              content: body.data,
            },
          },
        }),
      });

      if (!gistResponse.ok) {
        const err = await gistResponse.text();
        return new Response(`Gist creation failed: ${err}`, { status: 502, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response('Internal error', { status: 500, headers: corsHeaders });
    }
  },
};
