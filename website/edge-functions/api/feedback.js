export async function onRequestPost({ request, env }) {
  try {
    const STATS_KV = env?.STATS_KV ?? globalThis?.STATS_KV;
    if (!STATS_KV) {
      return new Response(
        JSON.stringify({ error: 'KV not configured' }),
        {
          status: 503,
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be 1-5' }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const date = new Date().toISOString().split('T')[0];
    const ua = request.headers.get('user-agent') || 'unknown';
    const key = `feedback:${date}`;
    const existing = await STATS_KV.get(key);
    let data = existing ? JSON.parse(existing) : { entries: [] };

    data.entries.push({
      rating,
      text: String(body.text || '').slice(0, 500),
      version: String(body.version || '').slice(0, 32),
      platform: String(body.platform || '').slice(0, 16),
      ua,
      ts: Date.now(),
    });

    // Limit entries per day to avoid KV size limits
    if (data.entries.length > 200) {
      data.entries = data.entries.slice(-200);
    }

    await STATS_KV.put(key, JSON.stringify(data), {
      expirationTtl: 60 * 60 * 24 * 90,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
