'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Package, Truck, CreditCard, Check } from 'lucide-react';

const STEPS = [
  { icon: ShoppingCart, label: 'Carrinho' },
  { icon: Package, label: 'Dados' },
  { icon: Truck, label: 'Entrega' },
  { icon: CreditCard, label: 'Pagamento' },
  { icon: Check, label: 'Confirmação' },
];

interface CheckoutProgressProps {
  /** 0 = Carrinho, 1 = Dados, 2 = Entrega, 3 = Pagamento, 4 = Confirmação */
  currentStep: number;
}

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={index} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.07 }}
                className="flex flex-col items-center"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                    isActive
                      ? 'bg-[#CC1020] text-white shadow-red-200 shadow-md ring-4 ring-red-100'
                      : isDone
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-[#CC1020] font-bold'
                      : isDone
                      ? 'text-[#1A1A1A]'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </motion.div>

              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-8 mx-1.5 mt-[-18px] transition-colors duration-300 ${
                    isDone ? 'bg-[#1A1A1A]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
