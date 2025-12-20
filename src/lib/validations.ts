import { z } from 'zod';

// ============================================
// USER SCHEMAS
// ============================================

export const RegisterSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  phone: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const ProductSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  ean: z.string().optional(),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  shortDescription: z.string().max(160).optional(),
  price: z.number().positive('Preço deve ser positivo'),
  compareAtPrice: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  stock: z.number().int().min(0, 'Estoque não pode ser negativo'),
  stockLocation: z.string().optional(),
  categoryId: z.string(),
  specs: z.record(z.any()).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// ============================================
// ORDER SCHEMAS
// ============================================

export const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'Pedido deve ter pelo menos 1 item'),
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO', 'CASH']),
  installments: z.number().int().min(1).max(12),
  shippingAddress: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
  }),
  couponCode: z.string().optional(),
});

// ============================================
// COUPON SCHEMAS
// ============================================

export const CouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  scope: z.enum(['GLOBAL', 'CATEGORY', 'PRODUCT', 'STATE']),
  scopeValues: z.array(z.string()).optional(),
  minPurchase: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  usagePerUser: z.number().int().positive().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ============================================
// FINANCIAL CONFIG SCHEMA
// ============================================

export const FinancialConfigSchema = z.object({
  creditCardInterestRate: z.number().min(0).max(100),
  debitCardInterestRate: z.number().min(0).max(100),
  maxInstallments: z.number().int().min(1).max(24),
  minInstallmentValue: z.number().positive(),
  freeShippingMinValue: z.number().positive().optional(),
  defaultMarkupPercentage: z.number().min(0).max(500),
});

// Type exports
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ProductInput = z.infer<typeof ProductSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CouponInput = z.infer<typeof CouponSchema>;
export type FinancialConfigInput = z.infer<typeof FinancialConfigSchema>;
