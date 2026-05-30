import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Calendar, MessageCircle, AlertTriangle } from 'lucide-react';

export default function Expired() {
  const { profile, logout } = useAuth();

  const whatsappNum = import.meta.env.VITE_WHATSAPP_NUMBER || '';
  
  // Constrói a mensagem automática para enviar no WhatsApp
  const userEmail = profile?.email || '';
  const messageText = encodeURIComponent(
    `Olá! Gostaria de renovar meu acesso ao SlidOz.\n\nE-mail de acesso: ${userEmail}\nPlano anterior: ${
      profile?.subscriptionType === 'annual' ? 'Anual' : 'Mensal (30 dias)'
    }`
  );
  
  const whatsappUrl = `https://wa.me/${whatsappNum}?text=${messageText}`;

  const formatExpiryDate = () => {
    if (!profile?.expiresAt) return 'Não definida';
    const date = profile.expiresAt.toDate 
      ? profile.expiresAt.toDate() 
      : new Date(profile.expiresAt);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4 relative overflow-hidden font-['DM_Sans']">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#FF6584] opacity-[0.08] blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#6C63FF] opacity-[0.08] blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* EXPIRED CARD */}
      <div className="w-full max-w-[480px] bg-[rgba(22,22,22,0.65)] backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center relative z-10">
        
        {/* WARNING ICON */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(255,101,132,0.1)] border border-[rgba(255,101,132,0.2)] flex items-center justify-center mx-auto mb-6 text-[#FF6584] animate-bounce">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="font-['Syne'] text-2xl md:text-3xl font-bold mb-3 tracking-tight">Assinatura Expirada</h2>
        <p className="text-sm text-[rgba(255,255,255,0.5)] mb-6 max-w-sm mx-auto leading-relaxed">
          Olá, <span className="text-white font-semibold">{profile?.name || 'Cliente'}</span>. Identificamos que o prazo da sua assinatura do SlidOz venceu e seu acesso foi temporariamente suspenso.
        </p>

        {/* DETAILS TABLE */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 mb-8 text-left space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[rgba(255,255,255,0.4)]">E-mail da Conta</span>
            <span className="font-medium text-white/90">{profile?.email || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[rgba(255,255,255,0.4)]">Plano Contratado</span>
            <span className="font-medium text-white/90">
              {profile?.subscriptionType === 'annual' ? 'Plano Anual' : 'Plano Mensal (30 dias)'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[rgba(255,255,255,0.4)]">Data de Expiração</span>
            <span className="font-medium text-[#FF6584] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatExpiryDate()}
            </span>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="space-y-3">
          {/* RENEW BUTTON (WHATSAPP) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[rgba(37,211,102,0.15)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            Renovar pelo WhatsApp
          </a>

          {/* LOGOUT BUTTON */}
          <button
            onClick={() => logout()}
            className="w-full py-3.5 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.8)] font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Entrar com Outra Conta
          </button>
        </div>

        <div className="mt-8 text-[10px] text-[rgba(255,255,255,0.3)] leading-relaxed">
          Se você acabou de realizar o pagamento da renovação no checkout da InfinitePay, por favor envie o comprovante para nosso WhatsApp para liberarmos o acesso imediatamente.
        </div>

      </div>
    </div>
  );
}
