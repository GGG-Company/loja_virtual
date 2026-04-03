'use client';

import { Phone, MessageCircle, Clock } from 'lucide-react';

export function SupportChatTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Suporte</h2>
        <p className="text-sm text-gray-500 mt-1">Entre em contato com nossa equipe de atendimento.</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="bg-[#CC1020]/10 rounded-full p-3">
            <Phone className="h-6 w-6 text-[#CC1020]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Telefone / WhatsApp</p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#CC1020] font-mono text-lg hover:underline"
            >
              (11) 99999-9999
            </a>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-[#CC1020]/10 rounded-full p-3">
            <MessageCircle className="h-6 w-6 text-[#CC1020]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">E-mail</p>
            <a
              href="mailto:suporte@azura.dev.br"
              className="text-[#CC1020] hover:underline"
            >
              suporte@azura.dev.br
            </a>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-[#CC1020]/10 rounded-full p-3">
            <Clock className="h-6 w-6 text-[#CC1020]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Horário de atendimento</p>
            <p className="text-gray-600 text-sm">Segunda a sexta, das 9h às 18h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
