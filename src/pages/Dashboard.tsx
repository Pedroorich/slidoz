import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Grid, Pencil, Trash2, Copy, Play, Folder, ArrowLeft, Wand2 } from 'lucide-react';
import { get, set } from 'idb-keyval';

export interface CarouselHistoryItem {
  id: string;
  title: string;
  topic: string;
  numSlides: number;
  slides: any[];
  brandName: string;
  primaryColor: string;
  tone: string;
  fontPairingIndex: number;
  createdAt: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<CarouselHistoryItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      let historyData: CarouselHistoryItem[] = [];
      const localSaved = localStorage.getItem('carousel_history');
      
      if (localSaved) {
        // Migrate from localStorage to IndexedDB
        historyData = JSON.parse(localSaved);
        await set('carousel_history', historyData);
        localStorage.removeItem('carousel_history');
      } else {
        const idbSaved = await get('carousel_history');
        if (idbSaved) {
          historyData = idbSaved;
        }
      }
      setHistory(historyData);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const deleteItem = async (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    await set('carousel_history', updated);
  };

  const duplicateItem = async (item: CarouselHistoryItem) => {
    const newItem = {
      ...item,
      id: Math.random().toString(36).substring(7),
      createdAt: Date.now()
    };
    const updated = [newItem, ...history];
    setHistory(updated);
    await set('carousel_history', updated);
  };

  const formatRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    const daysDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) {
      const hoursDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60));
      if (hoursDifference === 0) {
        const minutesDifference = Math.round((timestamp - Date.now()) / (1000 * 60));
        return rtf.format(minutesDifference, 'minute');
      }
      return rtf.format(hoursDifference, 'hour');
    }
    return rtf.format(daysDifference, 'day');
  };

  // Group history by brandName (Profile)
  const profilesMap = history.reduce((acc, item) => {
    const profileName = item.brandName?.trim() || 'Geral';
    if (!acc[profileName]) {
      acc[profileName] = [];
    }
    acc[profileName].push(item);
    return acc;
  }, {} as Record<string, CarouselHistoryItem[]>);

  const profiles = Object.keys(profilesMap).sort();
  const displayedHistory = selectedProfile ? profilesMap[selectedProfile] || [] : [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] font-['DM_Sans']">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="SlidOz Logo" 
            className="h-8 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('logo-fallback');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div id="logo-fallback" className="hidden items-center gap-2">
            <Wand2 className="w-6 h-6 text-[#6C63FF]" />
            <span className="font-['Syne'] font-bold text-xl tracking-tight">SlidOz</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.1)]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-[pulse-green_2s_infinite]"></div>
            <span className="text-xs font-medium text-[rgba(240,240,240,0.8)]">IA Ativa</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* HERO SECTION */}
        <section className="mb-16">
          <h1 className="font-['Syne'] text-3xl md:text-4xl font-bold mb-8 text-white">O que vamos criar hoje?</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Card 1 */}
            <div 
              onClick={() => navigate('/gerador')}
              className="bg-[#161616] border border-[rgba(108,99,255,0.3)] rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(108,99,255,0.15)] transition-all duration-300 group flex flex-col h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-[rgba(108,99,255,0.1)] flex items-center justify-center mb-4 group-hover:bg-[rgba(108,99,255,0.2)] transition-colors">
                <Sparkles className="w-6 h-6 text-[#6C63FF]" />
              </div>
              <h3 className="font-['Syne'] text-xl font-semibold mb-2">Criar com IA</h3>
              <p className="text-[rgba(240,240,240,0.6)] text-sm mb-6 flex-grow">
                Descreva um tema e a IA monta texto, layout e imagens automaticamente.
              </p>
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                Começar <span className="text-lg leading-none">→</span>
              </button>
            </div>

            {/* Card 2 (Criar do Zero) */}
            <div 
              onClick={() => navigate('/gerador', { state: { mode: 'manual' } })}
              className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 cursor-pointer hover:scale-[1.02] hover:border-[rgba(255,255,255,0.2)] transition-all duration-300 group flex flex-col h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4 group-hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <Pencil className="w-6 h-6 text-[rgba(240,240,240,0.9)]" />
              </div>
              <h3 className="font-['Syne'] text-xl font-semibold mb-2">Criar do Zero</h3>
              <p className="text-[rgba(240,240,240,0.6)] text-sm mb-6 flex-grow">
                Abra o editor e construa seu carrossel slide por slide com controle total.
              </p>
              <button className="w-full py-3 rounded-xl border border-[rgba(255,255,255,0.2)] font-semibold text-white flex items-center justify-center gap-2 group-hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                Abrir Editor <span className="text-lg leading-none">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* HISTORY SECTION */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {selectedProfile && (
                <button 
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors mr-2"
                  title="Voltar para Perfis"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="font-['Syne'] text-2xl font-bold">
                {selectedProfile ? `Carrosséis: ${selectedProfile}` : 'Perfis (Marcas)'}
              </h2>
              <div className="bg-[rgba(255,255,255,0.1)] px-2.5 py-0.5 rounded-full text-sm font-medium">
                {selectedProfile ? displayedHistory.length : profiles.length}
              </div>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
                <Grid className="w-8 h-8 text-[rgba(240,240,240,0.4)]" />
              </div>
              <h3 className="font-['Syne'] text-xl font-semibold mb-2">Nenhum carrossel ainda</h3>
              <p className="text-[rgba(240,240,240,0.6)] max-w-md">
                Seus carrosséis gerados aparecerão aqui. Comece criando um novo com a ajuda da IA!
              </p>
            </div>
          ) : !selectedProfile ? (
            /* PROFILES GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profiles.map((profile) => (
                <div 
                  key={profile} 
                  onClick={() => setSelectedProfile(profile)}
                  className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 cursor-pointer hover:border-[rgba(108,99,255,0.5)] hover:shadow-[0_0_20px_rgba(108,99,255,0.1)] transition-all group flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[rgba(108,99,255,0.1)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Folder className="w-8 h-8 text-[#6C63FF]" />
                  </div>
                  <h3 className="font-['Syne'] text-xl font-bold mb-1 text-white truncate w-full">{profile}</h3>
                  <p className="text-sm text-[rgba(240,240,240,0.5)]">
                    {profilesMap[profile].length} {profilesMap[profile].length === 1 ? 'carrossel' : 'carrosséis'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* CAROUSELS GRID FOR SELECTED PROFILE */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedHistory.map((item) => (
                <div key={item.id} className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-colors flex flex-col">
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] p-4 relative flex items-center justify-center border-b border-[rgba(255,255,255,0.06)]">
                    <div className="absolute top-3 left-3 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                      IA
                    </div>
                    <div className="absolute top-3 right-3 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm px-2 py-1 rounded text-[10px] font-medium text-[rgba(255,255,255,0.8)]">
                      {item.numSlides} slides
                    </div>
                    <h4 className="font-['Syne'] text-center text-lg font-bold px-4 line-clamp-3 text-white/90">
                      {item.title}
                    </h4>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-base mb-1 truncate" title={item.title}>{item.title}</h3>
                    <p className="text-xs text-[rgba(240,240,240,0.5)] mb-4">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                      <button 
                        onClick={() => navigate('/gerador', { state: { carouselData: item } })}
                        className="flex-1 bg-[rgba(108,99,255,0.15)] hover:bg-[rgba(108,99,255,0.25)] text-[#6C63FF] py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">Abrir</span>
                      </button>
                      <button 
                        onClick={() => duplicateItem(item)}
                        className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg text-[rgba(240,240,240,0.7)] transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="p-2 bg-[rgba(255,69,58,0.1)] hover:bg-[rgba(255,69,58,0.2)] rounded-lg text-[#FF453A] transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-8 text-center text-[rgba(240,240,240,0.3)] text-sm">
        SlidOz © 2026 — Gerador de Carrosséis com IA
      </footer>
    </div>
  );
}
