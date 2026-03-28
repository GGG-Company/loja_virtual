'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PickingReportItem } from './picking-report-table';

interface PickingReportModalProps {
  report: PickingReportItem[];
  onClose: () => void;
}

export function PickingReportModal({ report, onClose }: PickingReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] overflow-hidden border border-metallic-100">
        <div className="flex items-center justify-between p-4 border-b border-metallic-100">
          <div>
            <p className="text-lg font-semibold text-metallic-900">
              Todos os itens do relatório
            </p>
            <p className="text-sm text-metallic-600">{report.length} itens agrupados</p>
          </div>
          <button
            className="p-2 rounded-md hover:bg-gray-50 text-metallic-600"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="text-left text-metallic-600 sticky top-0 bg-white border-b border-metallic-100">
              <tr>
                <th className="py-2 px-4">Produto</th>
                <th className="py-2 px-4">SKU</th>
                <th className="py-2 px-4">Endereço no estoque</th>
                <th className="py-2 px-4 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-metallic-100">
              {report.map((item) => (
                <tr key={`${item.id}-${item.location}`} className="align-top">
                  <td className="py-2 px-4 font-semibold text-metallic-900">{item.name}</td>
                  <td className="py-2 px-4 text-metallic-700">{item.sku || '-'}</td>
                  <td className="py-2 px-4 text-metallic-700">{item.location}</td>
                  <td className="py-2 px-4 text-right font-semibold text-metallic-900">
                    {item.quantity}
                  </td>
                </tr>
              ))}
              {report.length === 0 && (
                <tr>
                  <td className="py-3 px-4 text-metallic-600" colSpan={4}>
                    Nenhum item para separar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-metallic-100">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
