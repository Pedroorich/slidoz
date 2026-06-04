import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, Wand2, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, isSubscriptionActive, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redireciona caso o usuário já esteja logado
  useEffect(() => {
    if (!loading && user) {
      if (profile) {
        if (profile.role === 'admin') {
          const origin = (location.state as any)?.from?.pathname || '/admin';
          navigate(origin);
        } else if (profile.isAffiliate) {
          // Afiliado sempre vai para o Painel de Afiliados ao logar, mesmo se a assinatura do gerador estiver inativa
          const origin = (location.state as any)?.from?.pathname || '/afiliados';
          navigate(origin);
        } else if (isSubscriptionActive) {
          // Redireciona para onde estava tentando ir ou para a Home
          const origin = (location.state as any)?.from?.pathname || '/';
          navigate(origin);
        } else {
          navigate('/expired');
        }
      } else {
        // Se o usuário está logado mas o perfil é nulo (geralmente porque o Firestore não está inicializado no console)
        setIsSubmitting(false);
        setError('Login efetuado com sucesso no Auth, mas seu perfil não pôde ser lido ou criado. Certifique-se de que você criou o "Firestore Database" no menu esquerdo do seu Firebase Console e ativou as regras descritas no arquivo firestore.rules.md!');
      }
    }
  }, [user, profile, loading, isSubscriptionActive, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // O useEffect acima irá tratar o redirecionamento automático quando o estado do AuthProvider atualizar
    } catch (err: any) {
      console.error('Erro de login:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos. Por favor, tente novamente.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas. Tente novamente mais tarde.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError('Ocorreu um erro ao fazer login. Tente novamente.');
      }
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-[#6C63FF] border-r-transparent border-b-[#FF6584] border-l-transparent rounded-full animate-spin"></div>
          <p className="text-[rgba(255,255,255,0.6)] font-medium font-['DM_Sans'] animate-pulse">Carregando SlidOz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4 relative overflow-hidden font-['DM_Sans']">
      
      {/* GLOWING AMBIENT BACKGROUND */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6C63FF] opacity-[0.12] blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#FF6584] opacity-[0.12] blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-[#00E5FF] opacity-[0.05] blur-[150px] pointer-events-none"></div>

      {/* LOGIN CARD */}
      <div className="w-full max-w-[440px] bg-[rgba(22,22,22,0.65)] backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-300">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] flex items-center justify-center shadow-lg shadow-[rgba(108,99,255,0.2)] mb-4">
            <Wand2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-['Syne'] text-2xl font-bold tracking-tight">Entrar no SlidOz</h2>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">Acesse sua ferramenta profissional de carrosséis</p>
        </div>

        {/* ERROR FEEDBACK */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[rgba(255,69,58,0.1)] border border-[rgba(255,69,58,0.2)] text-[#FF453A] flex items-start gap-3 animate-[shake_0.4s_ease-in-out]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium leading-tight">{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* EMAIL FIELD */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider pl-1">E-mail de Acesso</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)]">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-12 pr-4 py-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus:border-[#6C63FF] rounded-2xl text-sm placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:shadow-[0_0_20px_rgba(108,99,255,0.1)] disabled:opacity-50 text-white"
                required
              />
            </div>
          </div>

          {/* PASSWORD FIELD */}
          <div className="space-y-2">
            <div className="flex justify-between items-center pl-1">
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider">Sua Senha</label>
              <button
                type="button"
                onClick={() => setError('Caso tenha esquecido sua senha, por favor entre em contato com o suporte no WhatsApp para redefinição.')}
                className="text-xs font-medium text-[#6C63FF] hover:text-[#ff6a8f] transition-colors"
              >
                Esqueceu?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)]">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-12 pr-12 py-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus:border-[#6C63FF] rounded-2xl text-sm placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:shadow-[0_0_20px_rgba(108,99,255,0.1)] disabled:opacity-50 text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* SIGN IN BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 mt-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[rgba(108,99,255,0.15)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Entrar na Plataforma'
            )}
          </button>
        </form>

        {/* SUBSCRIBER NOTICE */}
        <div className="mt-8 text-center text-xs text-[rgba(255,255,255,0.45)] leading-relaxed">
          Para assinar, compre através do nosso checkout oficial e envie o comprovante. Seu login será gerado em instantes!
        </div>

      </div>

      {/* INJECT KEYFRAME ANIMATIONS */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
