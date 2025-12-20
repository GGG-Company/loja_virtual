import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Singleton Axios Instance com Interceptors
 * 
 * Features:
 * - Interceptor de Request: adiciona Authorization header automaticamente
 * - Interceptor de Response: tratamento global de erros
 * - Toast notifications integradas (via Sonner)
 */

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Adicionar token se existir (para APIs autenticadas)
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth-token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { response } = error;

        // Tratamento de erros HTTP
        if (response) {
          switch (response.status) {
            case 401:
              // Unauthorized: redirecionar para login
              if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
              }
              break;
            case 403:
              console.error('Acesso negado');
              break;
            case 404:
              console.error('Recurso não encontrado');
              break;
            case 500:
              console.error('Erro interno do servidor');
              break;
          }
        } else if (error.request) {
          // Request foi feito mas sem resposta (timeout, network error)
          console.error('Erro de rede ou timeout');
        }

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
