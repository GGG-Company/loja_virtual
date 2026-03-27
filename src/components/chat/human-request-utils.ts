const HUMAN_PATTERNS = [
  'atendente',
  'atendimento humano',
  'vou te conectar',
  'vou te transferir',
  'conectar com',
  'falar com atendente',
  'fale com um atendente',
  'transferindo',
  'entrar em contato com a equipe',
  'vou te passar para',
  'preciso falar com',
  'quero falar com um atendente',
  'continuar o atendimento',
  'continuar atendimento',
  'gostaria de continuar',
  'quero continuar',
  'abrir atendimento',
  'abrir chamado',
];

/** Returns true if the text contains a phrase that indicates a human agent request. */
export function detectHumanRequest(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HUMAN_PATTERNS.some((p) => lower.includes(p));
}
