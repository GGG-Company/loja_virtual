○ Compiling /api/admin/integrations/hiper/sync-products ...
[23:50:56] INFO: [HIPER_SYNC] Iniciando sync (pontoDeSincronizacao=0)
[23:50:56] INFO: [HIPER] Resposta auth
    tokenFields: [
      "chaveDeSeguranca",
      "token",
      "errors",
      "message"
    ]
    hasToken: true
    errors: []
[23:50:56] INFO: [HIPER] Token obtido com sucesso (primeiros 30 chars: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...)
 GET /api/auth/session 200 in 235ms (next.js: 39ms, proxy.ts: 118ms, application-code: 78ms)
 GET /api/auth/session 200 in 182ms (next.js: 21ms, proxy.ts: 92ms, application-code: 70ms)
[23:51:14] WARN: [HIPER] Nenhum produto configurado para sincroniza├º├úo no Hiper Gest├úo
[23:51:14] INFO: [HIPER_SYNC] 0 produtos recebidos do Hiper
 POST /api/admin/integrations/hiper/sync-products 200 in 26.7s (next.js: 8.1s, proxy.ts: 78ms, application-code: 18.6s)
[23:51:14] INFO: [HIPER_SYNC] Conclu├¡do ÔÇö matched:0 unmatched:0 stockUpdated:0 deactivated:0 errors:0 nextPoint:0