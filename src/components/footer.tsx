import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#111111] text-white">
      {/* Red top border */}
      <div className="h-1 bg-[#CC1020]" />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Marca */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src="/logo_shopping_das_ferramentas.jpg"
                  alt="Feira das Ferramentas"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <div className="font-display text-lg leading-tight">
                  <span className="text-[#CC1020]">Feira</span>{' '}
                  <span className="text-white">das</span>
                  <br />
                  <span className="text-white">Ferramentas</span>
                </div>
              </div>
            </div>
            <p className="text-xs font-bold text-[#CC1020] tracking-widest uppercase mb-3">
              Onde Você Encontra Tudo!
            </p>
            <p className="text-gray-400 text-sm font-body leading-relaxed">
              Sua loja especializada em ferramentas profissionais desde 2004.
              Qualidade e confiança para profissionais e entusiastas.
            </p>
            {/* Social */}
            <div className="flex gap-3 mt-5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-[#1e1e1e] hover:bg-[#CC1020] border border-white/10 rounded-sm flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-[#1e1e1e] hover:bg-[#CC1020] border border-white/10 rounded-sm flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Institucional */}
          <div>
            <h3 className="font-display font-bold text-sm tracking-widest uppercase text-[#CC1020] mb-4 pb-2 border-b border-white/10">
              Institucional
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: '/sobre', label: 'Sobre Nós' },
                { href: '/ofertas', label: 'Ofertas' },
                { href: '/contato', label: 'Contato' },
                { href: '/produtos', label: 'Produtos' },
                { href: '/privacidade', label: 'Política de Privacidade' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-1 text-gray-400 hover:text-[#CC1020] text-sm transition-colors font-body"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ajuda */}
          <div>
            <h3 className="font-display font-bold text-sm tracking-widest uppercase text-[#CC1020] mb-4 pb-2 border-b border-white/10">
              Minha Conta
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: '/minha-conta', label: 'Minha Conta' },
                { href: '/carrinho', label: 'Carrinho' },
                { href: '/checkout', label: 'Finalizar Compra' },
                { href: '/auth/login', label: 'Entrar' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-1 text-gray-400 hover:text-[#CC1020] text-sm transition-colors font-body"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h3 className="font-display font-bold text-sm tracking-widest uppercase text-[#CC1020] mb-4 pb-2 border-b border-white/10">
              Atendimento
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-8 h-8 bg-[#CC1020]/15 rounded flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-[#CC1020]" />
                </div>
                (75) 3333-4444
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-8 h-8 bg-[#CC1020]/15 rounded flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-[#CC1020]" />
                </div>
                contato@feiradeferramentas.com.br
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-8 h-8 bg-[#CC1020]/15 rounded flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-[#CC1020]" />
                </div>
                Feira de Santana, BA
              </li>
            </ul>

            {/* Bandeiras de pagamento */}
            <div className="mt-5">
              <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">
                Formas de Pagamento
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {['Pix', 'Débito', 'Crédito', 'Boleto'].map((m) => (
                  <span
                    key={m}
                    className="px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-[10px] text-gray-400 font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs font-body">
            © {new Date().getFullYear()} Feira das Ferramentas. Todos os direitos reservados.
          </p>
          <p className="text-gray-600 text-xs font-body">
            Feira de Santana, BA &mdash; Desde 2004
          </p>
        </div>
      </div>
    </footer>
  );
}
