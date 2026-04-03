import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

const logger = pino({
  level: isDev ? 'debug' : 'info',
  // LGPD Art. 46 — nunca logar dados pessoais em texto plano
  redact: {
    paths: [
      'email', '*.email', 'userEmail',
      'cpf', '*.cpf', 'dados.cpf',
      'phone', '*.phone', '*.telefone', 'dados.telefone',
      'password', '*.password',
      'dados.email', 'dados.nome',
      'shippingAddress.name', 'shippingAddress.zip', 'shippingAddress.street',
      'shippingAddress.phone', 'shippingAddress.cpf',
      'to.postal_code', 'from.postal_code',
    ],
    censor: '[REDACTED]',
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
        },
      }
    : undefined,
});

export default logger;
