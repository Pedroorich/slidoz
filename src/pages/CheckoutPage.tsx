import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Lock, User, Mail, ShieldCheck, CreditCard, Sparkles, AlertCircle, Wand2 } from 'lucide-react';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona imediatamente para a página de vendas, pois o checkout interno foi desativado
    navigate('/vendas', { replace: true });
  }, [navigate]);

  // Configurações dos links da InfinitePay e WhatsApp
  const MONTHLY_LINK = import.meta.env.VITE_INFINITEPAY_MONTHLY || 'https://pay.infinitepay.io/slidoz/mensal';
  const ANNUAL_LINK = import.meta.env.VITE_INFINITEPAY_ANNUAL || 'https://pay.infinitepay.io/slidoz/anual';
  const supportWhatsapp = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999';

  const selectedPlan = (location.state as any)?.plan || 'monthly';
  const planName = selectedPlan === 'annual' ? 'Plano Anual SlidOz' : 'Plano Mensal SlidOz';
  const planPrice = selectedPlan === 'annual' ? 'R$ 297,00/ano' : 'R$ 97,90/mês';
  const finalLink = selectedPlan === 'annual' ? ANNUAL_LINK : MONTHLY_LINK;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Por favor, preencha o seu nome e e-mail.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Resgata código do afiliado do LocalStorage se houver
      const referredBy = localStorage.getItem('slidoz_ref') || '';

      // 2. Registra o lead pendente no Firestore
      const pendingLeadsRef = collection(db, 'pending_leads');
      const newLeadDocRef = doc(pendingLeadsRef);

      await setDoc(newLeadDocRef, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        referredBy: referredBy,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 3. Exibe mensagem de sucesso e redireciona
      setSuccess(true);
      setTimeout(() => {
        // Redireciona o usuário para o link de pagamento oficial da InfinitePay
        window.location.href = finalLink;
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao registrar lead de checkout:', err);
      setError('Ocorreu um erro ao processar o seu checkout. Por favor, entre em contato com nosso suporte.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col md:flex-row font-['DM_Sans'] relative overflow-hidden">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6C63FF] opacity-[0.05] blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#FF6584] opacity-[0.05] blur-[120px] pointer-events-none"></div>

      {/* LEFT PANEL: PRODUCT BRIEFING */}
      <div className="w-full md:w-[45%] bg-[rgba(15,15,15,0.7)] backdrop-blur-xl border-b md:border-b-0 md:border-r border-[rgba(255,255,255,0.06)] p-8 md:p-16 flex flex-col justify-between relative z-10">
        
        {/* LOGO */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/vendas')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-['Syne'] font-bold text-lg tracking-tight">SlidOz</span>
        </div>

        {/* DETAILS */}
        <div className="my-10 md:my-0 space-y-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF6584] bg-[#FF6584]/10 px-3 py-1 rounded-full border border-[#FF6584]/20">
            Você está contratando
          </span>
          <h2 className="font-['Syne'] text-3xl font-extrabold text-white tracking-tight leading-none mt-2">
            {planName}
          </h2>
          <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[rgba(255,255,255,0.5)] font-mono">
            {planPrice}
          </div>

          <hr className="border-[rgba(255,255,255,0.05)] my-6" />

          {/* BENEFIT CHECKBOXES */}
          <ul className="space-y-4 text-xs text-[rgba(240,240,240,0.6)] leading-relaxed">
            <li className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
              Garantia de 7 dias ou seu dinheiro de volta.
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
              Acesso instantâneo após aprovação do pagamento.
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
              Criação e exportação de carrosséis sem limites.
            </li>
          </ul>
        </div>

        {/* FOOTER NOTICE */}
        <div className="text-[10px] text-[rgba(255,255,255,0.35)] leading-relaxed">
          Precisa de suporte? Converse conosco no WhatsApp:{' '}
          <a 
            href={`https://wa.me/${supportWhatsapp}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#6C63FF] hover:underline"
          >
            +{supportWhatsapp}
          </a>
        </div>
      </div>

      {/* RIGHT PANEL: SECURE FORM */}
      <div className="w-full md:w-[55%] p-8 md:p-20 flex items-center justify-center relative z-10">
        
        <div className="w-full max-w-[420px] bg-[rgba(22,22,22,0.55)] backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-3xl p-8 md:p-10 shadow-2xl">
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-['Syne'] text-xl font-bold text-white">Identificação Segura</h3>
            <p className="text-xs text-[rgba(255,255,255,0.45)] mt-1">Preencha seus dados para habilitar sua conta no SlidOz</p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 border-4 border-t-[#25D366] border-r-transparent border-b-[#25D366] border-l-transparent rounded-full animate-spin"></div>
              <p className="text-green-400 font-semibold text-sm">Dados salvos com sucesso!</p>
              <p className="text-xs text-[rgba(255,255,255,0.45)]">Redirecionando para a InfinitePay de forma segura...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* NOME */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider pl-1">Seu Nome Completo *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.35)]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] focus:border-[#6C63FF] rounded-xl text-xs placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:shadow-[0_0_15px_rgba(108,99,255,0.05)] text-white"
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider pl-1">E-mail para Acesso *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.35)]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] focus:border-[#6C63FF] rounded-xl text-xs placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:shadow-[0_0_15px_rgba(108,99,255,0.05)] text-white"
                    required
                  />
                </div>
                <span className="text-[9px] text-[rgba(255,255,255,0.3)] pl-1 block">Você usará este mesmo e-mail para fazer login.</span>
              </div>

              {/* WHATSAPP */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider pl-1">Seu WhatsApp (com DDD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.35)]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: 11999999999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] focus:border-[#6C63FF] rounded-xl text-xs placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:shadow-[0_0_15px_rgba(108,99,255,0.05)] text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[rgba(108,99,255,0.15)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Ir para Pagamento Seguro
                  </>
                )}
              </button>

            </form>
          )}

          <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-[rgba(255,255,255,0.35)]">
            <Lock className="w-3.5 h-3.5" />
            Seus dados estão protegidos por criptografia SSL.
          </div>

        </div>

      </div>

    </div>
  );
}
