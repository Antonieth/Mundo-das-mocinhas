import React from 'react';
import { Heart, MessageCircle, ShieldCheck, Truck } from 'lucide-react';

interface FooterProps {
  onOpenOrders: () => void;
  onSelectCategory: (cat: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenOrders,
  onSelectCategory,
}) => {
  return (
    <footer className="bg-zinc-950 text-white mt-20 border-t border-zinc-800">
      {/* Brand highlight stripe */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-500 to-pink-700 py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-serif italic text-white tracking-wide">
          <div className="flex items-center gap-2">
            <span className="font-bold font-sans not-italic">O Mundo das Mocinhas</span>
            <span>—</span>
            <span>Mais que uma loja, é um estilo de vida! ♥</span>
          </div>
          <a
            href="https://wa.me/244923000000?text=Olá%20O%20Mundo%20das%20Mocinhas!%20Gostaria%20de%20informações."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-zinc-950 px-4 py-2 rounded-full font-sans font-bold text-xs hover:bg-pink-50 transition-colors shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Fale connosco no WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/Captura_de_ecr__2026-10-23_003850_d2da05b5.png"
                alt="Logótipo O Mundo das Mocinhas"
                className="w-12 h-12 rounded-full object-cover border-2 border-pink-500"
              />
              <div>
                <h3 className="font-serif font-bold text-lg text-white">O Mundo das Mocinhas</h3>
                <p className="text-[11px] text-pink-400 font-medium">Cosméticos & Beleza em Angola</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O seu destino cor-de-rosa preferido em Angola para cosméticos, maquilhagem, cuidados de pele e cabelo, perfumes e acessórios que realçam a tua essência.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider uppercase text-pink-400">
              Categorias Populares
            </h4>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li>
                <button
                  onClick={() => onSelectCategory('Maquilhagem')}
                  className="hover:text-pink-400 transition-colors"
                >
                  Maquilhagem & Pós
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Skincare')}
                  className="hover:text-pink-400 transition-colors"
                >
                  Cuidados de Skincare
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Cabelos')}
                  className="hover:text-pink-400 transition-colors"
                >
                  Kits para Cabelos Crespas & Cacheadas
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Bolsas & Necessaires')}
                  className="hover:text-pink-400 transition-colors"
                >
                  Bolsas & Necessaires
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Acessórios')}
                  className="hover:text-pink-400 transition-colors"
                >
                  Copos Térmicos & Strass
                </button>
              </li>
            </ul>
          </div>

          {/* Shipping & Payment in Angola */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider uppercase text-pink-400">
              Envios em Angola
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enviamos para todas as 18 províncias através de parceiros oficiais: Real Express, Macon, Huambo Express, Rosalina Express e outras transportadoras de sua preferência.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">Luanda</span>
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">Benguela</span>
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">Huambo</span>
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">Huíla</span>
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">Cabinda</span>
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">Namibe</span>
              <span className="px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">e outras...</span>
            </div>
          </div>

          {/* Client support & Portal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider uppercase text-pink-400">
              Apoio ao Cliente
            </h4>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li>
                <button onClick={onOpenOrders} className="hover:text-pink-400 transition-colors">
                  Acompanhar Encomenda
                </button>
              </li>
              <li>
                <button onClick={onOpenOrders} className="hover:text-pink-400 transition-colors">
                  Histórico de Pedidos
                </button>
              </li>
              <li>
                <span className="text-zinc-500">Horário: Seg a Sáb das 8h às 19h</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} O Mundo das Mocinhas. Todos os direitos reservados. Angola.</p>
          <div className="flex items-center gap-1 text-zinc-400">
            <span>Desenvolvido com</span>
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 inline" />
            <span>para as Mocinhas de Angola</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
