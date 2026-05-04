'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface PickingReportItem {
  id: string;
  name: string;
  sku?: string | null;
  location: string;
  quantity: number;
  orders?: Array<{ orderNumber: string; quantity: number }>;
}

interface PickingReportTableProps {
  report: PickingReportItem[];
  preview?: boolean;
  onExportPdf: () => void;
  onShowAll?: () => void;
}

export function PickingReportTable({
  report,
  preview = false,
  onExportPdf,
  onShowAll,
}: PickingReportTableProps) {
  const rows = preview ? report.slice(0, 5) : report;

  const copyReport = () => {
    const text = report
      .map(
        (item) =>
          `${item.name} | Qtd: ${item.quantity} | Local: ${item.location}${item.sku ? ` | SKU: ${item.sku}` : ''}`
      )
      .join('\n');
    navigator.clipboard?.writeText(text).then(() => toast.success('Relatório copiado'));
  };

  const exportCsv = () => {
    const header = 'Produto,SKU,Localização,Quantidade\n';
    const rows = report
      .map(
        (item) =>
          `${item.name.replace(/,/g, ' ')},${item.sku || ''},${item.location.replace(/,/g, ' ')},${item.quantity}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'picking-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-metallic-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-metallic-900">Relatório de picking</p>
          <p className="text-sm text-metallic-600">
            Itens agrupados por produto e endereço no estoque
          </p>
          {preview && report.length > 5 && (
            <p className="text-xs text-metallic-500 mt-1">
              Mostrando top 5 itens · Total: {report.length}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyReport}
            disabled={report.length === 0}
          >
            Copiar
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={report.length === 0}>
            Exportar CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onExportPdf}
            disabled={report.length === 0}
          >
            Exportar PDF
          </Button>
          {preview && report.length > 5 && onShowAll && (
            <Button size="sm" variant="outline" onClick={onShowAll}>
              Ver todos
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-metallic-600">
            <tr>
              <th className="py-2">Produto</th>
              <th className="py-2">SKU</th>
              <th className="py-2">Endereço no estoque</th>
              <th className="py-2 text-right">Quantidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-metallic-100">
            {rows.map((item) => (
              <tr key={`${item.id}-${item.location}`} className="align-top">
                <td className="py-2 font-semibold text-metallic-900">{item.name}</td>
                <td className="py-2 text-metallic-700">{item.sku || '-'}</td>
                <td className="py-2 text-metallic-700">{item.location}</td>
                <td className="py-2 text-right font-semibold text-metallic-900">
                  {item.quantity}
                </td>
              </tr>
            ))}
            {report.length === 0 && (
              <tr>
                <td className="py-3 text-metallic-600" colSpan={4}>
                  Nenhum item para separar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
