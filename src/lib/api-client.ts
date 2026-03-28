import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Singleton Axios Instance com Interceptors
 *
 * Features:
 * - Request interceptor: adiciona Authorization header se houver token em localStorage
 * - Response interceptor: tratamento global de erros HTTP
 *
 * NOTA DE SEGURANÇA: O token de autenticação principal é gerenciado pelo NextAuth
 * via cookies httpOnly. O `auth-token` em localStorage é usado apenas para tokens
 * de fluxos específicos (ex: integrações externas). Nunca armazene o token de sessão
 * NextAuth em localStorage.
 */

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      // Em client-side, usa URL relativa (mesmo origem).
      // Em server-side (SSR/API routes), usa NEXT_PUBLIC_APP_URL.
      baseURL: typeof window !== 'undefined'
        ? ''
        : (process.env.NEXT_PUBLIC_APP_URL ?? ''),
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ── Request ──────────────────────────────────────────────────────────
    this.instance.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          try {
            const token = localStorage.getItem('auth-token');
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch {
            // localStorage inacessível (ex: iframe com sandbox restrito)
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ── Response ─────────────────────────────────────────────────────────
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { response } = error;

        if (response) {
          switch (response.status) {
            case 401:
              // Não redireciona automaticamente — cada página protegida
              // trata o 401 individualmente para evitar redirect em páginas públicas.
              break;
            case 403:
              // Acesso negado — deixar cada chamada tratar conforme contexto
              break;
            case 404:
              // Recurso não encontrado — sem log genérico (muito ruído)
              break;
            case 500:
              // Erro de servidor — o backend já loga; não duplicar no client
              break;
          }
        }
        // Erros de rede (timeout, offline) chegam aqui sem `response`
        // Cada chamada deve usar try/catch e exibir toast adequado.

        return Promise.reject(error);
      }
    );
  }

  public get axiosInstance(): AxiosInstance {
    return this.instance;
  }
}

// Exportar instância única
export const apiClient = new ApiClient().axiosInstance;
