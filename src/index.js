export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    const addHeaders = (response) => {
      const newHeaders = new Headers(response.headers);
      Object.entries(securityHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    };

    // Serve static assets via Cloudflare Workers ASSETS binding
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) {
          return addHeaders(response);
        }
      } catch (err) {
        console.error("Asset fetch error:", err);
      }
    }

    // Fallback to index.html for single page application routing
    const indexUrl = new URL("/index.html", request.url);
    if (env.ASSETS) {
      const resp = await env.ASSETS.fetch(indexUrl);
      return addHeaders(resp);
    }

    return new Response("Not Found", { status: 404, headers: securityHeaders });
  }
};
