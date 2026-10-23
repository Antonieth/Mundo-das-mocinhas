import React from 'react';
import { Truck, ShieldCheck, Sparkles, HeartHandshake, ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  onShopClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onShopClick }) => {
  return (
    <section className="relative overflow-hidden mb-8">
      {/* Editorial Main Hero Container */}
      <div className="relative rounded-3xl overflow-hidden mx-4 sm:mx-6 lg:mx-8 bg-gradient-to-r from-pink-100 via-pink-200 to-rose-200 shadow-xl border border-pink-200/60 min-h-[380px] sm:min-h-[440px] flex items-center">
        {/* Visual Background / Photo Blend */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png"
            alt="Universo O Mundo das Mocinhas"
            className="w-full h-full object-cover object-right opacity-80 sm:opacity-90"
          />
          {/* Enhanced contrast overlay: dark pink on mobile for readability, soft white on desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-950/85 via-pink-900/75 to-pink-900/60 sm:from-white/95 sm:via-white/80 sm:to-transparent" />
        </div>

        {/* Content Box */}
        <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-10 sm:py-16 text-white sm:text-zinc-900">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 sm:bg-pink-100 border border-pink-400/40 sm:border-pink-300 text-pink-200 sm:text-pink-700 text-xs font-semibold mb-4 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 sm:text-amber-500 fill-amber-300 sm:fill-amber-500" />
            <span>Colecção Exclusiva O Mundo das Mocinhas</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            A tua beleza, o nosso maior{' '}
            <span className="text-amber-300 sm:text-pink-600 italic">Encanto</span>{' '}
            <span className="text-pink-300 sm:text-pink-500">♥</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-pink-50 sm:text-zinc-700 max-w-lg leading-relaxed font-normal">
            Produtos de qualidade, tendências de maquilhagem, cosméticos e cuidados para te fazeres ainda mais especial.
            Entregas seguras para Luanda e todas as províncias de Angola!
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={onShopClick}
              className="px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Comprar Agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-xs text-pink-100 sm:text-zinc-600 font-medium">
              ✨ Preços oficiais em Kwanzas (Kz)
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900">Envio para todo o país</h2>
              <p className="text-[11px] text-zinc-500">Para todas as províncias de Angola</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900">Pagamento no Site</h2>
              <p className="text-[11px] text-zinc-500">Multicaixa Express & Comprovativo directo</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900">Produtos Originais</h2>
              <p className="text-[11px] text-zinc-500">100% de qualidade e autenticidade</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900">Atendimento Dedicado</h2>
              <p className="text-[11px] text-zinc-500">Apoio próximo para as Mocinhas</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
