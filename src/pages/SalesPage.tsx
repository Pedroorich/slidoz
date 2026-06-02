import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Wand2, 
  Zap, 
  Shield, 
  HelpCircle, 
  Check, 
  ArrowRight, 
  Users, 
  Clock, 
  TrendingUp, 
  Play, 
  ChevronDown, 
  Share2, 
  Star,
  Copy,
  DollarSign,
  AlertCircle,
  Briefcase,
  Timer,
  Flame,
  Gem,
  Crown,
  Award,
  Cpu,
  Layers,
  MousePointerClick,
  Gift,
  Compass,
  HeartHandshake,
  Lock,
  Mail,
  X,
  Instagram,
  MessageCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function SalesPage() {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'rosto' | 'infinito' | 'estilo' | 'identidade'>('rosto');

  // Estados do Modal de Identificação Rápida (Checkout externo)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadWhatsapp, setLeadWhatsapp] = useState('');
  const [isLeadLoading, setIsLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Captura do afiliado
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('slidoz_ref', refCode.trim().toLowerCase());
      localStorage.setItem('slidoz_ref_timestamp', Date.now().toString());
      console.log(`Afiliado '${refCode}' detectado e armazenado.`);
    }
  }, []);

  // Scroll animations Intersection Observer
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -50px 0px'
    });
    
    elements.forEach((el) => observer.observe(el));
    
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Delay video loading to make sure initial load is ultra light
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);



  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleBuy = (plan: 'annual' | 'monthly') => {
    setSelectedPlan(plan);
    setLeadName('');
    setLeadEmail('');
    setLeadWhatsapp('');
    setLeadError(null);
    setLeadSuccess(false);
    setIsLeadLoading(false);
    setIsCheckoutModalOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) {
      setLeadError('Por favor, preencha o seu nome e e-mail.');
      return;
    }

    setIsLeadLoading(true);
    setLeadError(null);

    try {
      // 1. Resgata código do afiliado do LocalStorage se houver
      const referredBy = localStorage.getItem('slidoz_ref') || '';

      // 2. Registra o lead pendente no Firestore
      const pendingLeadsRef = collection(db, 'pending_leads');
      const newLeadDocRef = doc(pendingLeadsRef);

      await setDoc(newLeadDocRef, {
        name: leadName.trim(),
        email: leadEmail.trim().toLowerCase(),
        whatsapp: leadWhatsapp.replace(/\D/g, ''),
        referredBy: referredBy,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 3. Exibe mensagem de sucesso e redireciona
      setLeadSuccess(true);
      setTimeout(() => {
        // Redireciona o usuário para o link de pagamento oficial da InfinitePay
        const finalLink = selectedPlan === 'annual' 
          ? 'https://checkout.infinitepay.io/ph_buisness/6qQtHyUhXN'
          : 'https://checkout.infinitepay.io/ph_buisness/I8bFlq0TTr';
        window.location.href = finalLink;
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao registrar lead de checkout:', err);
      setLeadError('Ocorreu um erro ao processar o seu cadastro. Por favor, fale conosco no WhatsApp ou tente novamente.');
      setIsLeadLoading(false);
    }
  };

  const faqs = [
    {
      q: "O que é o SlidOz?",
      a: "O SlidOz é um gerador e editor profissional de carrosséis impulsionado por Inteligência Artificial. Ele cria roteiros, escolhe cores harmônicas, fontes e gera imagens incríveis para seu Instagram, LinkedIn ou de seus clientes em menos de 3 minutos."
    },
    {
      q: "Como funciona a economia com a API própria?",
      a: "Diferente de outras ferramentas que cobram taxas por geração de imagem, no SlidOz você utiliza a sua própria chave de API (como a do Google Gemini). Isso significa que você tem custo zero de geração diretamente conosco e paga centavos de dólar diretamente para o provedor apenas pelo que usar!"
    },
    {
      q: "Posso exportar em PDF e Imagens?",
      a: "Com certeza! Você pode exportar seus carrosséis em formato de imagens PNG de alta resolução ou em arquivos PDF prontos para publicação em carrossel nativo do LinkedIn."
    },
    {
      q: "Consigo criar carrosséis com a identidade da minha marca?",
      a: "Sim! O SlidOz possui um gerenciador de perfis onde você salva o nome da sua marca, logotipo, cores primárias/secundárias e fontes preferidas. A IA gerará roteiros e designs respeitando estritamente a sua marca."
    },
    {
      q: "Como funciona a garantia?",
      a: "Oferecemos garantia incondicional de 7 dias. Se por qualquer motivo você não gostar da ferramenta, basta solicitar o reembolso total e faremos a devolução imediatamente."
    }
  ];

  return (
    <div className="sales-page-wrapper">
      
      {/* INJECT PREMIUM CSS CUSTOM STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@300;400;500;600;700&display=swap');
        
        .sales-page-wrapper {
          --void: #0D0A12;
          --abyssal: #2E1065;
          --magic: #7C3AED;
          --mist: #C4B5FD;
          --cream: #F5EFE6;
          --muted: rgba(245, 239, 230, 0.45);
          
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 300;
          background: var(--void);
          color: var(--cream);
          overflow-x: hidden;
          letter-spacing: -0.01em;
          min-height: 100vh;
        }

        h1, h2, h3, h4, .font-heading {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .font-brand-italic {
          font-family: 'Times New Roman', Times, serif !important;
          font-style: italic !important;
          font-weight: 400 !important;
          letter-spacing: 0em !important;
        }

        /* Glowing Background Orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }

        /* Buttons */
        .btn-magic {
          position: relative; z-index: 1; overflow: hidden;
          display: inline-flex; align-items: center; gap: 12px;
          padding: 15px 30px 15px 34px; border-radius: 999px;
          color: #fff; font-weight: 600; font-size: 16px;
          text-decoration: none; border: 1px solid rgba(196, 181, 253, 0.35);
          box-shadow: 0 10px 35px rgba(124, 58, 237, 0.25), inset 0 1px 0 rgba(255,255,255,0.4);
          transition: transform .25s, box-shadow .25s;
          cursor: pointer;
        }
        .btn-magic::before {
          content: ''; position: absolute; inset: 0; z-index: -1;
          background: linear-gradient(135deg, var(--magic) 0%, #a855f7 100%); border-radius: inherit;
        }
        .btn-magic:hover {
          transform: translateY(-2.5px);
          box-shadow: 0 16px 48px rgba(124, 58, 237, 0.45);
        }
        .btn-magic .arr {
          width: 32px; height: 32px; background: rgba(255,255,255,0.18);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;
        }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 12px;
          padding: 15px 30px; border-radius: 999px;
          color: var(--cream); font-weight: 500; font-size: 15px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(196, 181, 253, 0.15);
          text-decoration: none; transition: all .2s;
          cursor: pointer;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,0.08); color: #fff;
          transform: translateY(-2px);
          border-color: rgba(196, 181, 253, 0.3);
        }

        /* Pulse glow animation for CTA buttons */
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4), 0 8px 28px rgba(124, 58, 237, 0.2); }
          50% { box-shadow: 0 0 0 12px rgba(124, 58, 237, 0), 0 12px 38px rgba(124, 58, 237, 0.3); }
        }
        .pg-btn { animation: pulse-glow 2s infinite; }

        /* Topbar gradient animation */
        @keyframes topbarFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .topbar {
          background: linear-gradient(135deg, var(--abyssal), var(--magic), #a855f7, var(--abyssal));
          background-size: 300% 300%;
          animation: topbarFlow 6s ease-in-out infinite;
          padding: 12px 16px; text-align: center; font-size: 13px; font-weight: 500; color: #fff;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          position: relative; z-index: 51;
          border-bottom: 1px solid rgba(196, 181, 253, 0.1);
        }

        /* Instagram story conic gradient indicator */
        .story-ring {
          width: 82px; height: 82px; border-radius: 50%; padding: 2.5px;
          background: conic-gradient(from 0deg, var(--magic), var(--mist), #c084fc, var(--magic));
          position: relative; flex-shrink: 0;
        }
        .story-ring::after {
          content: ''; position: absolute; inset: 2.5px; border-radius: 50%; background: var(--void);
        }
        .story-ring img {
          position: relative; z-index: 1; width: 100%; height: 100%; border-radius: 50%;
          object-fit: cover; border: 2.5px solid var(--void); background: var(--void);
        }

        /* Continuous scrolling marquee for slide carousels */
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .carousel-track-left {
          display: flex;
          width: max-content;
          animation: scroll-left 50s linear infinite;
          will-change: transform;
        }
        .carousel-track-right {
          display: flex;
          width: max-content;
          animation: scroll-right 50s linear infinite;
          will-change: transform;
        }
        .carousel-outer {
          overflow: hidden;
          width: 100vw;
          margin-left: calc(-50vw + 50%);
          position: relative;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
        }
        .slide-card {
          flex-shrink: 0;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s;
          border: 1.5px solid rgba(196, 181, 253, 0.1);
          box-shadow: 0 15px 40px -10px rgba(0, 0, 0, 0.6);
        }
        .slide-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: rgba(124, 58, 237, 0.5);
          box-shadow: 0 25px 50px -12px rgba(124, 58, 237, 0.25);
          z-index: 10;
        }

        /* Section labels */
        .sec-lbl {
          display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600;
          letter-spacing: .12em; text-transform: uppercase; color: var(--mist);
        }
        .sec-lbl::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: var(--magic); display: inline-block;
          box-shadow: 0 0 8px var(--magic);
        }

        /* Premium sliding pricing toggle */
        .plan-toggle-container {
          display: flex; align-items: center; justify-content: center; margin-top: 20px;
        }
        .plan-toggle {
          position: relative; display: flex; align-items: center;
          background: rgba(255,255,255,.03); border: 1px solid rgba(196, 181, 253, 0.1);
          border-radius: 999px; padding: 4px; gap: 0; cursor: pointer;
        }
        .plan-toggle-slider {
          position: absolute; top: 4px; left: 4px; height: calc(100% - 8px);
          border-radius: 999px; background: linear-gradient(135deg, var(--magic) 0%, #a855f7 100%);
          z-index: 0; width: 120px;
          transition: transform .25s cubic-bezier(.4, 0, .2, 1);
          box-shadow: 0 3px 14px rgba(124, 58, 237, 0.4);
        }
        .plan-toggle button {
          position: relative; z-index: 1; width: 120px; padding: 10px 8px;
          border-radius: 999px; border: none; cursor: pointer; font-size: 13px;
          font-weight: 500; font-family: inherit; background: transparent;
          color: rgba(245, 239, 230, 0.45); transition: color .2s; text-align: center;
        }
        .plan-toggle button.active {
          color: #fff; font-weight: 600;
        }

        /* High-fidelity FAQ Accordions */
        .faq-item {
          border-radius: 20px; border: 1px solid rgba(196, 181, 253, 0.06);
          background: rgba(255, 255, 255, 0.02); padding: 20px 24px; cursor: pointer;
          transition: background .25s, border-color .25s;
        }
        .faq-item.open {
          background: rgba(124, 58, 237, 0.03); border-color: rgba(124, 58, 237, 0.25);
          box-shadow: 0 8px 30px rgba(124, 58, 237, 0.04);
        }
        .faq-icon {
          transition: transform .4s cubic-bezier(.34, 1.56, .64, 1), border-color .3s, color .3s;
          width: 30px; height: 30px; border: 1px solid rgba(196, 181, 253, 0.15);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          color: var(--mist); font-size: 18px;
        }
        .faq-item.open .faq-icon {
          transform: rotate(45deg); border-color: var(--magic); color: #fff;
          background: var(--magic); box-shadow: 0 0 10px rgba(124, 58, 237, 0.35);
        }

        /* iOS-like slide-down transition using grid-rows */
        .faq-answer {
          display: grid; grid-template-rows: 0fr;
          transition: grid-template-rows .38s cubic-bezier(.33,1,.68,1);
        }
        .faq-item.open .faq-answer { grid-template-rows: 1fr; }
        .faq-answer-inner {
          overflow: hidden; min-height: 0; opacity: 0; transform: translateY(-6px);
          transition: opacity .3s, transform .3s;
        }
        .faq-item.open .faq-answer-inner { opacity: 1; transform: translateY(0); padding-top: 12px; }

        /* Comparison value stack rows */
        .v-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 14px 0; border-bottom: 1px solid rgba(196, 181, 253, 0.06);
        }
        .v-row:last-child { border-bottom: 0; }

        /* Scroll Animations */
        .reveal {
          opacity: 0;
          will-change: transform, opacity;
        }
        
        .reveal-fade {
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-fade.revealed {
          opacity: 1;
        }
        
        .reveal-slide-up {
          transform: translateY(40px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-slide-up.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        
        .reveal-slide-left {
          transform: translateX(-40px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-slide-left.revealed {
          opacity: 1;
          transform: translateX(0);
        }
        
        .reveal-slide-right {
          transform: translateX(40px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-slide-right.revealed {
          opacity: 1;
          transform: translateX(0);
        }
        
        /* Delays */
        .delay-100 { transition-delay: 100ms !important; }
        .delay-200 { transition-delay: 200ms !important; }
        .delay-300 { transition-delay: 300ms !important; }
        .delay-400 { transition-delay: 400ms !important; }
        .delay-500 { transition-delay: 500ms !important; }
        
        /* Magic Animations & Glows */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        @keyframes magic-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-magic-rotate {
          animation: magic-rotate 10s linear infinite;
        }

        @keyframes border-shimmer {
          0% { border-color: rgba(124, 58, 237, 0.2); }
          50% { border-color: rgba(168, 85, 247, 0.6); }
          100% { border-color: rgba(124, 58, 237, 0.2); }
        }
        .animate-border-shimmer {
          animation: border-shimmer 4s ease-in-out infinite;
        }
        
        /* Glassmorphism Styles */
        .glass-card {
          background: rgba(255, 255, 255, 0.02) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px -10px rgba(124, 58, 237, 0.1) !important;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(124, 58, 237, 0.4) !important;
          transform: translateY(-6px) scale(1.01) !important;
          box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.9), 0 0 60px -5px rgba(124, 58, 237, 0.2) !important;
        }
        
        .glass-card-featured {
          background: rgba(124, 58, 237, 0.03) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(124, 58, 237, 0.35) !important;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 60px -10px rgba(124, 58, 237, 0.25) !important;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .glass-card-featured:hover {
          background: rgba(124, 58, 237, 0.05) !important;
          border-color: rgba(168, 85, 247, 0.6) !important;
          transform: translateY(-8px) scale(1.02) !important;
          box-shadow: 0 45px 90px -25px rgba(0, 0, 0, 0.95), 0 0 70px 0px rgba(124, 58, 237, 0.35) !important;
        }
        
        /* Magic Badge Glow */
        .badge-glow {
          position: relative;
          overflow: hidden;
        }

        /* Responsive Grids */
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
          .hero-cta-wrap { justify-content: center; }
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 480px !important; margin: 0 auto; }
          .comp-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }

        /* Premium Modal & Interaction Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* ══ TOP BAR ══ */}
      <div className="topbar">
        <Sparkles className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
        <span>Gere <b>Carrosséis Virais</b> de elite com IA no Instagram em <b>menos de 3 minutos!</b></span>
      </div>

      {/* ══ STICKY NAVIGATION BAR ══ */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-[rgba(196,181,253,0.06)] bg-[rgba(13,10,18,0.85)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-800 to-indigo-600 flex items-center justify-center shadow-md">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-['Syne'] font-extrabold text-xl tracking-tight text-white">SlidOz</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="#como-funciona" className="text-[rgba(245,239,230,0.65)] hover:text-white transition-colors">Como Funciona</a>
          <a href="#diferencial" className="text-[rgba(245,239,230,0.65)] hover:text-white transition-colors">A Diferença</a>
          <a href="#precos" className="text-[rgba(245,239,230,0.65)] hover:text-white transition-colors">Planos</a>
          <a href="#faq" className="text-[rgba(245,239,230,0.65)] hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="#precos" 
            className="btn-magic pg-btn nav-cta hidden sm:inline-flex"
            style={{ fontSize: '13px', padding: '9px 20px 9px 24px' }}
          >
            Fazer Mágica Agora
            <span className="arr" style={{ width: '28px', height: '28px' }}><ArrowRight className="w-3.5 h-3.5" /></span>
          </a>
          <button 
            onClick={() => navigate('/login')}
            className="text-xs font-semibold px-4.5 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(196,181,253,0.15)] rounded-full hover:bg-[rgba(255,255,255,0.07)] text-white tracking-wide transition-all cursor-pointer"
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ══ HERO SECTION: PERSUASIVE COPY & INTERACTIVE SIMULATOR ══ */}
      <section className="relative pt-16 pb-20 md:pt-28 md:pb-24 max-w-6xl mx-auto px-6 z-10 overflow-hidden">
        <div className="orb w-[550px] h-[550px] bg-[rgba(124,58,237,0.06)] -top-28 -left-28"></div>
        <div className="orb w-[350px] h-[350px] bg-[rgba(196,181,253,0.04)] top-20 -right-28"></div>

        {/* Ambient background video (looping, beautiful ambient contrast, dark overlay) */}
        {shouldLoadVideo && (
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-80">
            <video 
              src="/hero-loop.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline 
              preload="auto"
              className="w-full h-full object-cover"
              style={{ filter: 'blur(1.5px) brightness(0.55) contrast(1.1)' }}
            />
            {/* Gradient overlays to blend it perfectly with the page layout and secure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0D0A12]/40 to-[#0D0A12] z-10"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,#0D0A12_85%)] z-10"></div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto relative z-10">
          
          {/* Persuasive business-first copywriting */}
          <div className="reveal reveal-slide-up relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-[#2E1065]/40 border border-[#7C3AED]/20 px-4 py-1.5 rounded-full text-xs font-semibold text-mist mb-6 shadow-[0_0_15px_rgba(124,58,237,0.15)] animate-border-shimmer">
              <Sparkles className="w-3.5 h-3.5 text-mist animate-pulse" />
              SaaS Inovador de Design por IA
            </div>
            
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-cream leading-[1.08] mb-6">
              Deixe a Inteligência Artificial criar <span className="font-brand-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200">carrosséis mágicos</span> para seu negócio.
            </h1>
            
            <p className="text-base md:text-lg text-cream/70 leading-relaxed mb-8 max-w-2xl mx-auto">
              Transforme ideias simples em carrosséis ultra-profissionais com roteiros magnéticos estruturados de copy, paletas otimizadas e imagens IA de alta fidelidade. **Economize R$ 1.500/mês em designers lerdos com a velocidade do automático.**
            </p>
            
            <div className="hero-cta-wrap flex gap-4 flex-wrap justify-center">
              <a href="#precos" className="btn-magic pg-btn">
                Experimentar a Mágica Agora
                <span className="arr"><ArrowRight className="w-4 h-4 text-white" /></span>
              </a>
            </div>
            
            <p className="text-xs text-cream/40 mt-4.5 flex items-center gap-1.5 justify-center">
              <Timer className="w-3.5 h-3.5 text-mist" /> Sem taxas ocultas · Carrosséis ilimitados usando sua própria API Key
            </p>
          </div>

        </div>
      </section>

      {/* ══ CARROSSÉIS GERADOS COM A FERRAMENTA ══ */}
      <section className="py-16 border-y border-[rgba(196,181,253,0.06)] bg-[rgba(46,16,101,0.1)] relative z-10 overflow-hidden">
        <div className="text-center max-w-2xl mx-auto mb-12 px-6">
          <span className="sec-lbl">Portfólio de Sucesso</span>
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mt-3">
            Carrosséis gerados com a <span className="font-brand-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200">ferramenta</span>
          </h2>
          <p className="text-xs text-cream/50 mt-3">
            Veja a qualidade ultra-premium dos carrosséis gerados de forma automática e instantânea pelo SlidOz.
          </p>
        </div>

        <div className="flex flex-col gap-8 md:gap-10">
          
          {/* CAROUSEL 1: Empreendedorismo (emp) - Scrolls Left */}
          <div className="space-y-3">
            <div className="max-w-6xl mx-auto px-6">
              <span className="text-[10px] uppercase tracking-widest text-mist/60 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Carrossel de Empreendedorismo
              </span>
            </div>
            <div className="carousel-outer">
              <div className="carousel-track-left" style={{ animationDuration: '25s' }}>
                {/* Group 1 */}
                <div className="flex gap-4 pr-4">
                  {Array.from({ length: 7 }, (_, i) => `/slide_${i + 1} emp.png`).map((src, i) => (
                    <img 
                      key={`emp-1-${i}`} 
                      src={src} 
                      alt={`Empreendedorismo Slide ${i + 1}`} 
                      loading={i < 2 ? "eager" : "lazy"}
                      decoding="async"
                      className="h-64 sm:h-80 md:h-[400px] aspect-square object-cover rounded-2xl slide-card bg-[#161224]/50" 
                    />
                  ))}
                </div>
                {/* Group 2 (Clone for perfect seamless looping) */}
                <div className="flex gap-4 pr-4" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, i) => `/slide_${i + 1} emp.png`).map((src, i) => (
                    <img 
                      key={`emp-2-${i}`} 
                      src={src} 
                      alt={`Empreendedorismo Slide ${i + 1} clone`} 
                      loading="lazy"
                      decoding="async"
                      className="h-64 sm:h-80 md:h-[400px] aspect-square object-cover rounded-2xl slide-card bg-[#161224]/50" 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CAROUSEL 2: Marketing Digital (MD) - Scrolls Left */}
          <div className="space-y-3">
            <div className="max-w-6xl mx-auto px-6">
              <span className="text-[10px] uppercase tracking-widest text-mist/60 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Carrossel nicho de Moda
              </span>
            </div>
            <div className="carousel-outer">
              <div className="carousel-track-left" style={{ animationDuration: '20s' }}>
                {/* Group 1 */}
                <div className="flex gap-4 pr-4">
                  {Array.from({ length: 6 }, (_, i) => `/slide_${i + 1} MD.png`).map((src, i) => (
                    <img 
                      key={`md-1-${i}`} 
                      src={src} 
                      alt={`Marketing Digital Slide ${i + 1}`} 
                      loading={i < 2 ? "eager" : "lazy"}
                      decoding="async"
                      className="h-64 sm:h-80 md:h-[400px] aspect-square object-cover rounded-2xl slide-card bg-[#161224]/50" 
                    />
                  ))}
                </div>
                {/* Group 2 (Clone for perfect seamless looping) */}
                <div className="flex gap-4 pr-4" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => `/slide_${i + 1} MD.png`).map((src, i) => (
                    <img 
                      key={`md-2-${i}`} 
                      src={src} 
                      alt={`Marketing Digital Slide ${i + 1} clone`} 
                      loading="lazy"
                      decoding="async"
                      className="h-64 sm:h-80 md:h-[400px] aspect-square object-cover rounded-2xl slide-card bg-[#161224]/50" 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CAROUSEL 3: Sobral / Social Business (SB) - Scrolls Left */}
          <div className="space-y-3">
            <div className="max-w-6xl mx-auto px-6">
              <span className="text-[10px] uppercase tracking-widest text-mist/60 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Carrossel nicho de Beleza
              </span>
            </div>
            <div className="carousel-outer">
              <div className="carousel-track-left" style={{ animationDuration: '28s' }}>
                {/* Group 1 */}
                <div className="flex gap-4 pr-4">
                  {Array.from({ length: 7 }, (_, i) => `/slide_${i + 1} SB.png`).map((src, i) => (
                    <img 
                      key={`sb-1-${i}`} 
                      src={src} 
                      alt={`Social Business Slide ${i + 1}`} 
                      loading={i < 2 ? "eager" : "lazy"}
                      decoding="async"
                      className="h-64 sm:h-80 md:h-[400px] aspect-square object-cover rounded-2xl slide-card bg-[#161224]/50" 
                    />
                  ))}
                </div>
                {/* Group 2 (Clone for perfect seamless looping) */}
                <div className="flex gap-4 pr-4" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, i) => `/slide_${i + 1} SB.png`).map((src, i) => (
                    <img 
                      key={`sb-2-${i}`} 
                      src={src} 
                      alt={`Social Business Slide ${i + 1} clone`} 
                      loading="lazy"
                      decoding="async"
                      className="h-64 sm:h-80 md:h-[400px] aspect-square object-cover rounded-2xl slide-card bg-[#161224]/50" 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══ RECURSOS EXCLUSIVOS DO SLIDOZ ══ */}
      <section className="py-24 max-w-6xl mx-auto px-6 relative z-10">
        <style>{`
          @keyframes scan-line {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          .scan-beam {
            animation: scan-line 3.5s ease-in-out infinite;
          }
          .custom-scrollbar::-webkit-scrollbar {
            height: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.01);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(196, 181, 253, 0.15);
            border-radius: 99px;
          }
        `}</style>
        
        <div className="reveal reveal-slide-up text-center max-w-2xl mx-auto mb-16">
          <span className="sec-lbl">Recursos Exclusivos</span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-white mt-3 leading-tight">
            Tudo o que você precisa para <span className="font-brand-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200">crescer no Instagram</span>
          </h2>
          <p className="text-xs text-cream/50 mt-3">
            São dezenas de funcionalidades exclusivas dentro do SlidOZ. Veja as mais poderosas em ação e explore o editor mágico.
          </p>
        </div>

        {/* Tab Selector Bar */}
        <div className="reveal reveal-fade bg-[#13111C]/60 border border-white/[0.08] backdrop-blur-md rounded-[20px] p-2 mb-8 overflow-x-auto custom-scrollbar flex items-center justify-between gap-2.5 max-w-4xl mx-auto">
          
          {/* Tab 1: Seu Rosto */}
          <button
            onClick={() => setActiveFeatureTab('rosto')}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-xs transition-all cursor-pointer whitespace-nowrap glow-button flex-1 justify-center ${
              activeFeatureTab === 'rosto'
                ? 'bg-gradient-to-tr from-purple-800 to-indigo-600 border border-white/10 text-white active shadow-md'
                : 'text-cream/45 hover:text-white hover:bg-white/3 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Face-Sync IA</span>
          </button>

          {/* Tab 2: Carrossel Infinito */}
          <button
            onClick={() => setActiveFeatureTab('infinito')}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-xs transition-all cursor-pointer whitespace-nowrap glow-button flex-1 justify-center ${
              activeFeatureTab === 'infinito'
                ? 'bg-gradient-to-tr from-purple-800 to-indigo-600 border border-white/10 text-white active shadow-md'
                : 'text-cream/45 hover:text-white hover:bg-white/3 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Carrossel Infinito</span>
          </button>

          {/* Tab 3: Replicador de Estilo */}
          <button
            onClick={() => setActiveFeatureTab('estilo')}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-xs transition-all cursor-pointer whitespace-nowrap glow-button flex-1 justify-center ${
              activeFeatureTab === 'estilo'
                ? 'bg-gradient-to-tr from-purple-800 to-indigo-600 border border-white/10 text-white active shadow-md'
                : 'text-cream/45 hover:text-white hover:bg-white/3 border border-transparent'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Treinar Referências</span>
          </button>

          {/* Tab 4: Perfis de Marca */}
          <button
            onClick={() => setActiveFeatureTab('identidade')}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-xs transition-all cursor-pointer whitespace-nowrap glow-button flex-1 justify-center ${
              activeFeatureTab === 'identidade'
                ? 'bg-gradient-to-tr from-purple-800 to-indigo-600 border border-white/10 text-white active shadow-md'
                : 'text-cream/45 hover:text-white hover:bg-white/3 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Perfis de Marca</span>
          </button>

        </div>

        {/* Details Card Display */}
        <div className="reveal reveal-slide-up bg-[#13111C]/60 border border-white/[0.08] backdrop-blur-md rounded-[28px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] min-h-[460px] flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full">
            
            {/* Left Column: Copywriting */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {activeFeatureTab === 'rosto' && (
                <>
                  <span className="px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-[#2E1065]/60 text-rose-400 border border-[#7C3AED]/20">
                    GERAÇÃO POR REFERÊNCIA
                  </span>
                  <h3 className="font-heading text-2xl md:text-3.5xl font-extrabold text-white leading-tight">
                    O seu rosto perfeitamente integrado no design por IA
                  </h3>
                  <p className="text-cream/65 text-xs md:text-sm leading-relaxed">
                    Chega de usar imagens genéricas de banco de dados que todo mundo já viu. Com o sistema Face-Sync do SlidOZ, você faz upload de uma simples selfie ou foto do seu cliente, e a nossa inteligência artificial gera ilustrações e fotos profissionais contextualizadas mantendo os traços anatômicos, tom de pele e expressão. É personalização real para criar autoridade instantânea no feed.
                  </p>
                  <ul className="space-y-3.5 text-xs text-cream/75 font-light">
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Fotos suas em cenários corporativos, futuristas ou artísticos de alta fidelidade
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Consistência facial absoluta entre múltiplos slides do mesmo carrossel
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Destaque-se como autoridade inquestionável em mentorias, consultorias e lançamentos
                    </li>
                  </ul>
                </>
              )}

              {activeFeatureTab === 'infinito' && (
                <>
                  <span className="px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-[#2E1065]/60 text-rose-400 border border-[#7C3AED]/20">
                    EFEITO SEM EMENDAS (SEAMLESS)
                  </span>
                  <h3 className="font-heading text-2xl md:text-3.5xl font-extrabold text-white leading-tight">
                    Conexão fluida que prende o swipe do usuário
                  </h3>
                  <p className="text-cream/65 text-xs md:text-sm leading-relaxed">
                    O segredo dos maiores criadores de conteúdo do mundo é a retenção. Com o SlidOZ, o fundo de um slide se conecta perfeitamente ao próximo. A nossa IA estende ilustrações tridimensionais, texturas e gradientes pelas bordas, criando uma narrativa visual panorâmica. O usuário desliza o feed sem perceber que mudou de slide, aumentando o engajamento e retenção.
                  </p>
                  <ul className="space-y-3.5 text-xs text-cream/75 font-light">
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Alinhamento milimétrico automático de imagens e fundos estendidos entre slides
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Layout panorâmico contínuo que elimina a sensação de barreiras visuais no feed
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Altíssima taxa de retenção e tempo de permanência no seu post
                    </li>
                  </ul>
                </>
              )}

              {activeFeatureTab === 'estilo' && (
                <>
                  <span className="px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-[#2E1065]/60 text-rose-400 border border-[#7C3AED]/20">
                    REPLICADOR DE ESTILO ESTÉTICO
                  </span>
                  <h3 className="font-heading text-2xl md:text-3.5xl font-extrabold text-white leading-tight">
                    Replicou o design que você ama, na hora
                  </h3>
                  <p className="text-cream/65 text-xs md:text-sm leading-relaxed">
                    Encontrou um post ou imagem com uma estética fantástica na internet? Basta fazer o upload da imagem de referência no SlidOZ. Nosso mecanismo inteligente analisa instantaneamente a iluminação, paleta de cores, profundidade tridimensional e o direcionamento artístico da imagem. Ele cria novas imagens exclusivas seguindo estritamente esse mesmo padrão estético de elite.
                  </p>
                  <ul className="space-y-3.5 text-xs text-cream/75 font-light">
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Engenharia reversa de estilo automático sem precisar programar prompts complexos
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Criação de ativos de design únicos que seguem as maiores tendências globais
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Autonomia total para direcionar e replicar a direção de arte de toda a sua conta
                    </li>
                  </ul>
                </>
              )}

              {activeFeatureTab === 'identidade' && (
                <>
                  <span className="px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-[#2E1065]/60 text-rose-400 border border-[#7C3AED]/20">
                    CONSISTÊNCIA DE ELITE
                  </span>
                  <h3 className="font-heading text-2xl md:text-3.5xl font-extrabold text-white leading-tight">
                    Consistência de marca automatizada em segundos
                  </h3>
                  <p className="text-cream/65 text-xs md:text-sm leading-relaxed">
                    Esqueça ter que reconfigurar cores, logotipos e fontes em cada postagem. Salve as identidades visuais da sua marca ou dos seus clientes em Perfis de Marca. O SlidOZ memoriza as paletas exatas, fontes preferidas e logotipo, organizando tudo em coleções e pastas. A IA distribui harmonicamente esses elementos de forma nativa em toda a geração.
                  </p>
                  <ul className="space-y-3.5 text-xs text-cream/75 font-light">
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Perfis de marca ilimitados para gerenciar múltiplos clientes e contas de agência
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Combinação tipográfica premium automática baseada nas fontes de alta atração
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-4.5 h-4.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      Biblioteca de paletas inteligentes geradas e salvas no IndexedDB com um clique
                    </li>
                  </ul>
                </>
              )}

            </div>

            {/* Right Column: High-Fidelity CSS Mockups */}
            <div className="lg:col-span-6 flex items-center justify-center w-full min-h-[300px] bg-black/30 rounded-3xl border border-white/[0.06] overflow-hidden p-6 relative">
              
              {/* FACE-SYNC MOCKUP */}
              {activeFeatureTab === 'rosto' && (
                <div className="w-full flex items-center justify-center p-2">
                  <img 
                    src="/facesync.png" 
                    alt="Face-Sync IA" 
                    className="max-w-full max-h-[380px] w-auto h-auto object-contain rounded-2xl shadow-[0_20px_50px_rgba(124,58,237,0.15)] border border-white/5 transition-all duration-300" 
                  />
                </div>
              )}

              {/* CARROSSEL INFINITO MOCKUP */}
              {activeFeatureTab === 'infinito' && (
                <div className="w-full flex items-center justify-center p-2">
                  <img 
                    src="/carrossel infinito.png" 
                    alt="Carrossel Infinito" 
                    className="max-w-full max-h-[380px] w-auto h-auto object-contain rounded-2xl shadow-[0_20px_50px_rgba(124,58,237,0.15)] border border-white/5 transition-all duration-300" 
                  />
                </div>
              )}

              {/* TREINAR REFERÊNCIAS MOCKUP */}
              {activeFeatureTab === 'estilo' && (
                <div className="w-full flex items-center justify-center p-2">
                  <img 
                    src="/Treinar ref.png" 
                    alt="Treinar Referências" 
                    className="max-w-full max-h-[380px] w-auto h-auto object-contain rounded-2xl shadow-[0_20px_50px_rgba(124,58,237,0.15)] border border-white/5 transition-all duration-300" 
                  />
                </div>
              )}

              {/* PERFIS DE MARCA MOCKUP */}
              {activeFeatureTab === 'identidade' && (
                <div className="w-full flex flex-col items-center justify-center gap-4 max-w-sm">
                  {/* Brand Profile Dashboard Mockup */}
                  <div className="w-full bg-[#161616] border border-white/[0.08] rounded-2xl p-4 shadow-xl text-left space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                          <Wand2 className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <span className="text-[10px] font-extrabold text-white tracking-wide uppercase">Perfil: TechCorp</span>
                      </div>
                      <span className="text-[7px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold uppercase">Ativo</span>
                    </div>

                    {/* Colors and fonts preview */}
                    <div className="grid grid-cols-2 gap-3 text-[8px]">
                      <div>
                        <span className="text-cream/40 block mb-1">PALETA SALVA</span>
                        <div className="flex gap-1.5">
                          <span className="w-4 h-4 rounded bg-[#7C3AED] border border-white/5" title="#7C3AED"></span>
                          <span className="w-4 h-4 rounded bg-[#EC4899] border border-white/5" title="#EC4899"></span>
                          <span className="w-4 h-4 rounded bg-[#F5EFE6] border border-white/5" title="#F5EFE6"></span>
                          <span className="w-4 h-4 rounded bg-[#0D0A12] border border-white/5" title="#0D0A12"></span>
                        </div>
                      </div>
                      <div>
                        <span className="text-cream/40 block mb-1">FONTES ATIVAS</span>
                        <span className="text-white font-bold block">Syne / DM Sans</span>
                      </div>
                    </div>

                    {/* Miniature mockup slide output */}
                    <div className="w-full h-14 bg-gradient-to-r from-[#0D0A12] to-[#1E112A] rounded-xl border border-violet-500/20 p-2 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[5px] text-[#EC4899] block font-bold">TECHCORP</span>
                        <span className="text-[7px] text-white block font-extrabold font-heading tracking-tight leading-none">O Futuro dos Dados</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      </section>

      {/* ══ DETAILED DECK: COMO A MÁGICA ACONTECE ══ */}
      <section id="como-funciona" className="py-24 max-w-6xl mx-auto px-6 relative z-10">
        <div className="reveal reveal-slide-up text-center max-w-2xl mx-auto mb-16">
          <span className="sec-lbl">Inovação e Velocidade</span>
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mt-3">
            Gere carrosséis profissionais <span className="font-brand-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">com um clique</span>
          </h2>
          <p className="text-sm text-cream/50 mt-3">
            O SlidOz substitui processos manuais repetitivos por um motor inteligente de design que constrói tudo harmoniosamente em segundos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="reveal reveal-slide-up delay-100 bg-[#0E0A12]/40 backdrop-blur-md border border-[rgba(196,181,253,0.08)] hover:border-violet-500/35 p-8 rounded-3xl transition-all duration-400 group flex flex-col justify-between h-full shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#2E1065]/40 border border-[#7C3AED]/20 flex items-center justify-center text-mist mb-6 font-bold text-2xl font-heading group-hover:bg-violet-600 group-hover:text-white group-hover:border-transparent transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] animate-float">
                <Sparkles className="w-6 h-6 text-mist group-hover:text-white" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span>01. Copywriter IA</span>
              </h3>
              <p className="text-xs text-cream/50 leading-relaxed">
                Nossa inteligência artificial não faz apenas resumos. Ela redige ganchos magnéticos, chamadas à ação persuasivas e desenvolve o roteiro de conteúdo baseado na estrutura científica de alta atração AIDA.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="reveal reveal-slide-up delay-200 bg-[#0E0A12]/40 backdrop-blur-md border border-[rgba(196,181,253,0.08)] hover:border-violet-500/35 p-8 rounded-3xl transition-all duration-400 group flex flex-col justify-between h-full shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#2E1065]/40 border border-[#7C3AED]/20 flex items-center justify-center text-mist mb-6 font-bold text-2xl font-heading group-hover:bg-violet-600 group-hover:text-white group-hover:border-transparent transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] animate-float" style={{ animationDelay: '200ms' }}>
                <Gem className="w-6 h-6 text-mist group-hover:text-white animate-pulse" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span>02. Design Fluido</span>
              </h3>
              <p className="text-xs text-cream/50 leading-relaxed">
                Insira as fontes, logotipo e cores da sua empresa. O SlidOz gera os designs com as proporções, distribuições tipográficas e paletas de cores corretas de forma instantânea para dar consistência à sua marca.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="reveal reveal-slide-up delay-300 bg-[#0E0A12]/40 backdrop-blur-md border border-[rgba(196,181,253,0.08)] hover:border-violet-500/35 p-8 rounded-3xl transition-all duration-400 group flex flex-col justify-between h-full shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#2E1065]/40 border border-[#7C3AED]/20 flex items-center justify-center text-mist mb-6 font-bold text-2xl font-heading group-hover:bg-violet-600 group-hover:text-white group-hover:border-transparent transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] animate-float" style={{ animationDelay: '400ms' }}>
                <Wand2 className="w-6 h-6 text-mist group-hover:text-white" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span>03. Editor Mágico</span>
              </h3>
              <p className="text-xs text-cream/50 leading-relaxed">
                Quer alterar uma imagem ou ajustar um texto gerado pela IA? Nosso editor slide a slide robusto foi projetado para revisões finas imediatas. Sem carregar abas lentas, você edita tudo com facilidade absoluta.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ══ DIFFERENTIAL: COMPARISON OF ROI (A VERDADE BRUTAL - FAÇA AS CONTAS) ══ */}
      <section id="diferencial" className="reveal reveal-slide-up py-20 bg-[rgba(46,16,101,0.1)] border-y border-[rgba(196,181,253,0.06)] relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-mist mb-3 inline-block">• FAÇA AS CONTAS</span>
          
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-white mt-2 mb-10 leading-tight">
            Quanto você pagaria <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200 font-brand-italic">separado</span> por tudo isso?
          </h2>

          <div className="max-w-[720px] mx-auto">
            {/* List Box Container */}
            <div className="bg-[#13111C]/60 border border-white/[0.08] backdrop-blur-md rounded-[24px] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col gap-4.5">
                
                {/* Item 1: Canva Pro */}
                <div className="flex items-center justify-between pb-4.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center border border-white/10 shadow-inner flex-shrink-0">
                      <span className="text-[10px] font-black text-white font-sans tracking-tighter">C</span>
                    </div>
                    <span className="text-cream/90 text-sm font-semibold tracking-wide text-left">Canva Pro <span className="text-cream/40 font-light block sm:inline">(design)</span></span>
                  </div>
                  <span className="text-cream/35 line-through font-mono text-sm">R$ 49,90/mês</span>
                </div>

                {/* Item 2: ChatGPT Plus */}
                <div className="flex items-center justify-between pb-4.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#10a37f] flex items-center justify-center border border-white/10 shadow-inner flex-shrink-0">
                      <Cpu className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-cream/90 text-sm font-semibold tracking-wide text-left">ChatGPT Plus <span className="text-cream/40 font-light block sm:inline">(textos e ideias)</span></span>
                  </div>
                  <span className="text-cream/35 line-through font-mono text-sm">R$ 99,00/mês</span>
                </div>

                {/* Item 3: Google Gemini */}
                <div className="flex items-center justify-between pb-4.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-800 to-purple-900 flex items-center justify-center border border-white/10 shadow-inner flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-sky-300 animate-pulse" />
                    </div>
                    <span className="text-cream/90 text-sm font-semibold tracking-wide text-left">Google Gemini <span className="text-cream/40 font-light block sm:inline">(IA de imagem)</span></span>
                  </div>
                  <span className="text-cream/35 line-through font-mono text-sm">R$ 79,00/mês</span>
                </div>

                {/* Item 4: Photoshop */}
                <div className="flex items-center justify-between pb-4.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#001E36] border border-[#00c8ff]/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <span className="text-[11px] font-bold text-[#00c8ff] font-sans">Ps</span>
                    </div>
                    <span className="text-cream/90 text-sm font-semibold tracking-wide text-left">Photoshop <span className="text-cream/40 font-light block sm:inline">(editor profissional)</span></span>
                  </div>
                  <span className="text-cream/35 line-through font-mono text-sm">R$ 89,90/mês</span>
                </div>

                {/* Item 5: Designer Freelancer */}
                <div className="flex items-center justify-between pb-4.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-cream/70" />
                    </div>
                    <span className="text-cream/90 text-sm font-semibold tracking-wide text-left">Designer Freelancer <span className="text-cream/40 font-light block sm:inline">(layout)</span></span>
                  </div>
                  <span className="text-cream/35 line-through font-mono text-sm">R$ 250/mês</span>
                </div>

                {/* Item 6: Copywriter Freelancer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
                      <Copy className="w-4 h-4 text-cream/70" />
                    </div>
                    <span className="text-cream/90 text-sm font-semibold tracking-wide text-left">Copywriter Freelancer <span className="text-cream/40 font-light block sm:inline">(roteiros)</span></span>
                  </div>
                  <span className="text-cream/35 line-through font-mono text-sm">R$ 85/mês</span>
                </div>

              </div>
            </div>

            {/* Total Savings / Callout box */}
            <div className="bg-[#1A1826]/50 border border-white/[0.06] backdrop-blur-md rounded-[20px] p-6 mt-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
              <div className="text-center md:text-left">
                <span className="text-[9px] font-bold text-mist uppercase tracking-widest block mb-1">
                  SOMA DE TUDO (REFERÊNCIA)
                </span>
                <span className="text-3xl font-extrabold text-cream/40 line-through font-mono tracking-tight block">
                  ~R$ 652/mês
                </span>
                <span className="text-[11px] text-cream/45 mt-1.5 block leading-normal">
                  No <span className="font-semibold text-cream">SlidOz</span>, tudo está reunido por uma fração desse valor.
                </span>
              </div>

              <a 
                href="#precos"
                className="flex items-center gap-3 px-7 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold text-xs rounded-full shadow-[0_8px_25px_rgba(124,58,237,0.3)] transition-all cursor-pointer group flex-shrink-0"
              >
                <span>Ver planos</span>
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-violet-600 text-[10px] font-black transition-transform group-hover:translate-x-0.5">
                  &gt;
                </div>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ══ PRICING / PLANOS COM DYNAMIC TOGGLE ══ */}
      <section id="precos" className="py-24 max-w-6xl mx-auto px-6 relative z-10">
        <div className="reveal reveal-slide-up text-center max-w-2xl mx-auto mb-16">
          <span className="sec-lbl">Custo-Benefício Mágico</span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-white mt-3">Escolha seu <span className="font-brand-italic text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200">plano</span></h2>
          <p className="text-sm text-cream/50 mt-3">
            Garanta seu acesso imediato e liberte a criação mágica de carrosséis sem limites.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch mt-8">
          
          {/* PLANO MENSAL CARD */}
          <div className="reveal reveal-slide-right delay-100 glass-card rounded-3xl p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-[-35%] right-[-35%] w-52 h-52 bg-gradient-to-tr from-purple-800/10 to-transparent opacity-30 blur-2xl pointer-events-none"></div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-mist tracking-widest uppercase">
                  PLANO MENSAL MÁGICO
                </span>
                <Gem className="w-4 h-4 text-mist animate-float" />
              </div>
              
              <div className="flex items-baseline gap-2 mt-2 mb-4">
                <span className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">
                  R$ 97,90
                </span>
                <span className="text-sm font-brand-italic text-cream/45 ml-1">
                  /mês
                </span>
              </div>
              
              <p className="text-xs text-cream/50 leading-relaxed mb-6 font-light">
                Acesso total por 30 dias. Ideal para quem quer experimentar a ferramenta e sentir o poder da Inteligência Artificial em seu conteúdo no curto prazo.
              </p>

              <hr className="border-[rgba(196,181,253,0.06)] my-6" />

              <ul className="space-y-4 text-xs text-cream/70 font-light">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Criação Ilimitada de Carrosséis
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Editor Visual Slide a Slide Completo
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Gerenciador de 1 Perfil de Marca
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Roteiros estruturados por IA Copywriter
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Suporte prioritário via WhatsApp
                </li>
              </ul>
            </div>

            <button 
              onClick={() => handleBuy('monthly')}
              className="w-full py-4 mt-8 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 hover:scale-[1.01] hover:opacity-95 active:scale-[0.99] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Assinar Plano Mensal
            </button>
          </div>

          {/* PLANO ANUAL CARD - DESTACADO */}
          <div className="reveal reveal-slide-left delay-200 glass-card-featured rounded-3xl p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-[-35%] right-[-35%] w-52 h-52 bg-gradient-to-tr from-purple-600/20 to-indigo-500/20 opacity-40 blur-2xl pointer-events-none"></div>
            
            <div className="absolute top-4 right-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10 shadow-[0_0_15px_rgba(124,58,237,0.4)] animate-pulse">
              Melhor Valor · Economize 75%
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-violet-300 tracking-widest uppercase flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400 animate-float" /> PLANO ANUAL LENDÁRIO
                </span>
              </div>
              
              <div className="flex items-baseline gap-2 mt-2 mb-1">
                <span className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">
                  R$ 297,00
                </span>
                <span className="text-sm font-brand-italic text-cream/45 ml-1">
                  /ano
                </span>
              </div>
              <div className="text-[11px] font-brand-italic text-green-400 mb-4 tracking-wide">
                Equivale a apenas R$ 24,75 por mês!
              </div>
              
              <p className="text-xs text-cream/50 leading-relaxed mb-6 font-light">
                Acesso total por 1 ano completo. A decisão inteligente para criadores e empresas sérias de social media que desejam dominar o Instagram economizando metade do valor equivalente mensal.
              </p>

              <hr className="border-[rgba(196,181,253,0.06)] my-6" />

              <ul className="space-y-4 text-xs text-cream/70 font-light">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Criação Ilimitada de Carrosséis
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Editor Visual Slide a Slide Completo
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Gerenciador de Marcas Ilimitadas
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Roteiros estruturados por IA Copywriter
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-mist flex items-center justify-center text-[10px] flex-shrink-0 font-bold">✓</span>
                  Suporte Prioritário VIP via WhatsApp
                </li>
              </ul>
            </div>

            <button 
              onClick={() => handleBuy('annual')}
              className="w-full py-4 mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.01] hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-[rgba(196,181,253,0.2)] animate-pulse"
            >
              Assinar Plano Anual Agora
            </button>
          </div>

        </div>
      </section>

      {/* ══ FAQs SECTION WITH ELEGANT CHEVRON ACTIONS ══ */}
      <section id="faq" className="reveal reveal-slide-up py-24 max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="sec-lbl">FAQ Geral</span>
          <h2 className="font-['Syne'] text-3xl font-extrabold text-white mt-3">Dúvidas Frequentes</h2>
          <p className="text-xs text-cream/45 mt-2">Esclarecemos suas dúvidas rápidas de forma organizada</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div 
                key={index} 
                className={`faq-item ${isOpen ? 'open' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-cream select-none">
                  <span>{faq.q}</span>
                  <span className="faq-icon">+</span>
                </div>
                
                <div className="faq-answer">
                  <div className="faq-answer-inner text-xs text-cream/50 leading-relaxed font-light">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ NEW SUPPORT SECTION ══ */}
      <section id="suporte" className="reveal reveal-slide-up py-20 border-t border-[rgba(196,181,253,0.06)] bg-[rgba(13,10,18,0.3)] relative z-10 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF6584] mb-3 inline-block">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF6584] mr-2 shadow-[0_0_8px_#FF6584]"></span>
            SUPORTE
          </span>
          
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-white mt-2 mb-3 leading-tight">
            Suporte <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200 font-brand-italic">sempre presente</span>
          </h2>
          
          <p className="text-sm text-cream/50 max-w-xl mx-auto mb-12">
            Nossa equipe responde rápido. Escolha o canal que preferir.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* WhatsApp Card */}
            <div className="bg-[#13111C]/60 border border-white/[0.08] backdrop-blur-md rounded-[24px] p-6 md:p-8 flex flex-col justify-between items-center text-center shadow-[0_15px_35px_rgba(0,0,0,0.5)] group hover:border-violet-500/35 hover:shadow-[0_20px_50px_rgba(124,58,237,0.15)] transition-all duration-300">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center text-white mb-5 shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-all duration-300">
                  <MessageCircle className="w-6 h-6 text-white fill-white" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-2">WhatsApp</h3>
                <p className="text-xs text-cream/50 leading-relaxed mb-6">
                  Ideal para dúvidas rápidas sobre uso da plataforma, funcionalidades e primeiros passos.
                </p>
              </div>
              
              <div className="w-full pt-4 border-t border-white/[0.05] flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-cream/40 mb-3 block">
                  RESPOSTA EM ATÉ <span className="font-bold text-green-400 font-sans">2 horas</span>
                </span>
                <a 
                  href="https://w.app/aqo1pr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-white/3 hover:bg-white/7 text-cream hover:text-white border border-white/8 hover:border-white/15 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  Falar no WhatsApp
                  <span className="text-[10px] text-cream/50">&gt;</span>
                </a>
              </div>
            </div>

            {/* Instagram Card */}
            <div className="bg-[#13111C]/60 border border-white/[0.08] backdrop-blur-md rounded-[24px] p-6 md:p-8 flex flex-col justify-between items-center text-center shadow-[0_15px_35px_rgba(0,0,0,0.5)] group hover:border-violet-500/35 hover:shadow-[0_20px_50px_rgba(124,58,237,0.15)] transition-all duration-300">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center text-white mb-5 shadow-[0_0_15px_rgba(219,39,119,0.3)] group-hover:scale-110 transition-all duration-300">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-2">Instagram</h3>
                <p className="text-xs text-cream/50 leading-relaxed mb-6">
                  Mande uma DM no nosso Instagram Oficial caso precise de suporte ou tenha qualquer dúvida.
                </p>
              </div>
              
              <div className="w-full pt-4 border-t border-white/[0.05] flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-cream/40 mb-3 block">
                  RESPOSTA EM ATÉ <span className="font-bold text-purple-400 font-sans">24 horas</span>
                </span>
                <a 
                  href="https://www.instagram.com/slid.oz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-white/3 hover:bg-white/7 text-cream hover:text-white border border-white/8 hover:border-white/15 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  Enviar DM
                  <span className="text-[10px] text-cream/50">&gt;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ GLOBAL FOOTER ══ */}
      <footer className="border-t border-[rgba(196,181,253,0.06)] py-12 text-center text-xs text-cream/35 bg-[rgba(13,10,18,0.5)]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-mist" />
            <span className="font-['Syne'] font-extrabold text-base tracking-tight text-white">SlidOz</span>
          </div>
          <div>
            SlidOz © 2026 — Plataforma Profissional de Carrosséis por IA. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* ══ FAST CHECKOUT MODAL ══ */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          {/* Backdrop click close */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsCheckoutModalOpen(false)}></div>
          
          {/* Modal Container */}
          <div className="relative w-full max-w-[440px] bg-[#0E0A16] border border-white/[0.08] rounded-[28px] p-6 md:p-8 shadow-[0_30px_70px_rgba(124,58,237,0.3)] text-left z-10 overflow-hidden animate-scaleIn">
            
            {/* Ambient glows inside modal */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-xl pointer-events-none rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 blur-xl pointer-events-none rounded-full"></div>

            {/* Close Button */}
            <button 
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/5 border border-white/10 text-cream/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-tr from-purple-800 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-3 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white">Identificação Segura</h3>
              <p className="text-xs text-cream/50 mt-1 leading-normal">
                Insira seus dados para habilitar seu acesso no SlidOz e ir para o pagamento
              </p>
            </div>

            {leadError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{leadError}</span>
              </div>
            )}

            {leadSuccess ? (
              <div className="py-6 flex flex-col items-center gap-4 text-center animate-fadeIn">
                <div className="w-12 h-12 border-3 border-t-green-400 border-r-transparent border-b-green-400 border-l-transparent rounded-full animate-spin"></div>
                <p className="text-green-400 font-semibold text-sm">Cadastro salvo com sucesso!</p>
                <p className="text-xs text-cream/45">Redirecionando para a InfinitePay de forma segura...</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                
                {/* PLAN INFO WIDGET */}
                <div className="bg-white/3 border border-white/5 p-3 rounded-2xl flex items-center justify-between text-xs mb-2">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-cream/45 block">Plano Selecionado</span>
                    <span className="font-bold text-white">{selectedPlan === 'annual' ? 'Plano Anual Lendário' : 'Plano Mensal Mágico'}</span>
                  </div>
                  <span className="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200">
                    {selectedPlan === 'annual' ? 'R$ 297,00/ano' : 'R$ 97,90/mês'}
                  </span>
                </div>

                {/* NAME */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-cream/55 uppercase tracking-wider pl-1">Seu Nome Completo *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/35">
                      <Users className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="João da Silva"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      disabled={isLeadLoading}
                      className="w-full pl-11 pr-4 py-3 bg-white/2 border border-white/7 focus:border-violet-500 rounded-xl text-xs placeholder-cream/25 outline-none transition-all text-white focus:ring-1 focus:ring-violet-500/30"
                      required
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-cream/55 uppercase tracking-wider pl-1">E-mail de Acesso *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/35">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      disabled={isLeadLoading}
                      className="w-full pl-11 pr-4 py-3 bg-white/2 border border-white/7 focus:border-violet-500 rounded-xl text-xs placeholder-cream/25 outline-none transition-all text-white focus:ring-1 focus:ring-violet-500/30"
                      required
                    />
                  </div>
                  <span className="text-[9px] text-cream/35 pl-1 block">IMPORTANTE: Use o mesmo e-mail para fazer login.</span>
                </div>

                {/* WHATSAPP */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-cream/55 uppercase tracking-wider pl-1">Seu WhatsApp (com DDD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/35">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: 11999999999"
                      value={leadWhatsapp}
                      onChange={(e) => setLeadWhatsapp(e.target.value)}
                      disabled={isLeadLoading}
                      className="w-full pl-11 pr-4 py-3 bg-white/2 border border-white/7 focus:border-violet-500 rounded-xl text-xs placeholder-cream/25 outline-none transition-all text-white focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLeadLoading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-all cursor-pointer disabled:opacity-50 mt-4 border border-white/10"
                >
                  {isLeadLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Ir para Pagamento Seguro
                    </>
                  )}
                </button>

              </form>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-5 text-[10px] text-cream/35">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              <span>Seus dados estão protegidos por criptografia.</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
