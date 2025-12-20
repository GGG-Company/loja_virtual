import Link from 'next/link';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-metallic-900 text-white">
      <div className="border-t border-metallic-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sobre */}
          <div>
            <h3 className="text-lg font-bold mb-4">Shopping das Ferramentas</h3>
            <p className="text-metallic-400 text-sm">
              Sua loja especializada em ferramentas profissionais. 
              Qualidade e confiança desde 2020.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="text-lg font-bold mb-4">Institucional</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/sobre" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link href="/ofertas" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Ofertas
                </Link>
              </li>
              <li>
                <Link href="/contato" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link href="/produtos" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Produtos
                </Link>
              </li>
            </ul>
          </div>

          {/* Ajuda */}
          <div>
            <h3 className="text-lg font-bold mb-4">Ajuda</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/minha-conta" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Minha Conta
                </Link>
              </li>
              <li>
                <Link href="/carrinho" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Carrinho
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-metallic-400 hover:text-white text-sm transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h3 className="text-lg font-bold mb-4">Atendimento</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-metallic-400 text-sm">
                <Phone className="h-4 w-4" />
                (71) 3333-4444
              </li>
              <li className="flex items-center gap-2 text-metallic-400 text-sm">
                <Mail className="h-4 w-4" />
                contato@shopferramentas.com.br
              </li>
              <li className="flex items-center gap-2 text-metallic-400 text-sm">
                <MapPin className="h-4 w-4" />
                Salvador, BA
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h3 className="text-lg font-bold mb-4">Redes Sociais</h3>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-metallic-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-metallic-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-metallic-800 mt-8 pt-8 text-center">
          <p className="text-metallic-400 text-sm">
            © {new Date().getFullYear()} Shopping das Ferramentas. Todos os direitos reservados.
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}
