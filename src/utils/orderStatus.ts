/**
 * Order status flow and definitions for O Mundo das Mocinhas
 */

export type OrderStatus =
  | 'recebida'
  | 'aguardando_pagamento'
  | 'comprovativo_enviado'
  | 'em_verificacao'
  | 'pagamento_confirmado'
  | 'em_preparacao'
  | 'enviada'
  | 'em_transito'
  | 'disponivel_levantamento'
  | 'entregue'
  | 'cancelada'
  | 'pagamento_rejeitado';

export type PaymentStatus =
  | 'pendente'
  | 'comprovativo_enviado'
  | 'em_verificacao'
  | 'confirmado'
  | 'rejeitado'
  | 'reembolsado';

export interface StatusMeta {
  label: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  stepIndex: number;
}

export const ORDER_STATUS_MAP: Record<OrderStatus, StatusMeta> = {
  recebida: {
    label: 'Encomenda Recebida',
    description: 'A sua encomenda foi registada no sistema.',
    color: '#3B82F6',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    stepIndex: 0,
  },
  aguardando_pagamento: {
    label: 'Aguardando Pagamento',
    description: 'Aguardamos a transferência e o envio do comprovativo.',
    color: '#F59E0B',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
    stepIndex: 1,
  },
  comprovativo_enviado: {
    label: 'Comprovativo Enviado',
    description: 'Comprovativo submetido pelo cliente no site.',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
    stepIndex: 2,
  },
  em_verificacao: {
    label: 'Em Verificação',
    description: 'A equipa está a conferir o comprovativo bancário.',
    color: '#EC4899',
    badgeBg: 'bg-pink-50 border-pink-200',
    badgeText: 'text-pink-700',
    stepIndex: 2,
  },
  pagamento_confirmado: {
    label: 'Pagamento Confirmado',
    description: 'Pagamento verificado com sucesso pelo administrador.',
    color: '#10B981',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    stepIndex: 3,
  },
  em_preparacao: {
    label: 'Em Preparação',
    description: 'Produtos a serem separados e embalados com carinho.',
    color: '#06B6D4',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-700',
    stepIndex: 4,
  },
  enviada: {
    label: 'Entregue à Transportadora',
    description: 'Pacote entregue no ponto de despacho da transportadora.',
    color: '#6366F1',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-700',
    stepIndex: 5,
  },
  em_transito: {
    label: 'Em Trânsito',
    description: 'A caminho da sua província com a transportadora escolhida.',
    color: '#8B5CF6',
    badgeBg: 'bg-violet-50 border-violet-200',
    badgeText: 'text-violet-700',
    stepIndex: 6,
  },
  disponivel_levantamento: {
    label: 'Disponível para Levantamento',
    description: 'Pronto para recolha no terminal da transportadora.',
    color: '#14B8A6',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-700',
    stepIndex: 7,
  },
  entregue: {
    label: 'Entregue ao Cliente',
    description: 'Encomenda entregue com sucesso.',
    color: '#059669',
    badgeBg: 'bg-emerald-100 border-emerald-300',
    badgeText: 'text-emerald-800',
    stepIndex: 8,
  },
  cancelada: {
    label: 'Cancelada',
    description: 'Encomenda cancelada.',
    color: '#EF4444',
    badgeBg: 'bg-red-50 border-red-200',
    badgeText: 'text-red-700',
    stepIndex: -1,
  },
  pagamento_rejeitado: {
    label: 'Pagamento Rejeitado',
    description: 'O comprovativo não pôde ser validado. Por favor reenvie.',
    color: '#DC2626',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    stepIndex: 1,
  },
};

/**
 * Ordered sequence of timeline steps for positive order lifecycle
 */
export const ORDER_TIMELINE_STEPS = [
  { key: 'recebida', title: 'Pedido Recebido' },
  { key: 'pagamento_confirmado', title: 'Pagamento Confirmado' },
  { key: 'em_preparacao', title: 'Em Preparação' },
  { key: 'enviada', title: 'Entregue à Transportadora' },
  { key: 'em_transito', title: 'Em Trânsito' },
  { key: 'entregue', title: 'Entregue ao Cliente' },
];

export function getStatusStepNumber(status: OrderStatus): number {
  const meta = ORDER_STATUS_MAP[status];
  return meta ? meta.stepIndex : 0;
}
