import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  DollarSign, 
  Share2, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  ArrowLeft, 
  User, 
  Wand2, 
  Wallet,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AffiliateDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  // Estados dos dados de afiliados
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payoutsHistory, setPayoutsHistory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estados do formulário de Saque PIX
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // Feedbacks
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (profile && profile.isAffiliate) {
      loadAffiliateData();
      setPixKey(profile.pixKey || '');
      setPixKeyType(profile.pixKeyType || 'cpf');
    } else {
      setLoadingData(false);
    }
  }, [profile]);

  const loadAffiliateData = async () => {
    if (!profile) return;
    setLoadingData(true);
    try {
      // 1. Carrega todas as comissões deste afiliado
      const commissionsRef = collection(db, 'commissions');
      const commissionQuery = query(
        commissionsRef,
        where('affiliateId', '==', profile.uid)
      );
      const commSnap = await getDocs(commissionQuery);
      const commList: any[] = [];
      commSnap.forEach((doc) => {
        commList.push({ id: doc.id, ...doc.data() });
      });
      // Ordena por data decrescente
      setCommissions(commList.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));

      // 2. Carrega solicitações de saques deste afiliado
      const payoutsRef = collection(db, 'payout_requests');
      const payoutQuery = query(
        payoutsRef,
        where('affiliateId', '==', profile.uid)
      );
      const payoutSnap = await getDocs(payoutQuery);
      const payoutList: any[] = [];
      payoutSnap.forEach((doc) => {
        payoutList.push({ id: doc.id, ...doc.data() });
      });
      setPayoutsHistory(payoutList.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));

    } catch (e) {
      console.error("Erro ao carregar dados do afiliado:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCopyLink = () => {
    if (!profile || !profile.affiliateCode) return;
    const referralLink = `${window.location.origin}/vendas?ref=${profile.affiliateCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Digite um valor de saque válido.');
      return;
    }
    if (amountNum < 10) {
      setFormError('O valor mínimo para solicitação de saque é R$ 10,00.');
      return;
    }
    if (amountNum > (profile.balanceAvailable || 0)) {
      setFormError('O valor solicitado é maior do que o seu Saldo Disponível.');
      return;
    }
    if (!pixKey) {
      setFormError('Por favor, informe a sua chave PIX.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      // Regra de segurança: calcula solicitações pendentes anteriores
      const payoutsRef = collection(db, 'payout_requests');
      const pendingQuery = query(
        payoutsRef,
        where('affiliateId', '==', profile.uid),
        where('status', '==', 'pending')
      );
      const pendingSnap = await getDocs(pendingQuery);
      let pendingTotal = 0;
      pendingSnap.forEach(d => {
        pendingTotal += d.data().amount || 0;
      });

      if (amountNum + pendingTotal > (profile.balanceAvailable || 0)) {
        setFormError(`Você já possui solicitações pendentes acumuladas de R$ ${pendingTotal.toFixed(2)}, excedendo seu limite disponível.`);
        setFormLoading(false);
        return;
      }

      // Cria a solicitação no Firestore
      const newRequestDocRef = doc(payoutsRef);
      await setDoc(newRequestDocRef, {
        requestId: newRequestDocRef.id,
        affiliateId: profile.uid,
        amount: amountNum,
        pixKey: pixKey.trim(),
        pixKeyType: pixKeyType,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Salva chave PIX no perfil do afiliado para o próximo saque
      await setDoc(doc(db, 'users', profile.uid), {
        pixKey: pixKey.trim(),
        pixKeyType: pixKeyType
      }, { merge: true });

      setFormSuccess(`Solicitação de saque de R$ ${amountNum.toFixed(2)} enviada para auditoria! O saldo será liberado na sua conta cadastrada.`);
      setWithdrawAmount('');
      
      await loadAffiliateData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Erro ao processar sua solicitação de saque.');
    } finally {
      setFormLoading(false);
    }
  };

  const getFormatDate = (timestamp: any) => {
    if (!timestamp) return 'Processando';
    try {
      let date: Date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        return 'Processando';
      }
      
      return date.toLocaleDateString('pt-BR');
    } catch (err) {
      console.error("Erro ao formatar data:", err, timestamp);
      return 'Processando';
    }
  };

  // Se o usuário não estiver logado
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se o usuário logou mas não é um parceiro afiliado
  if (!profile.isAffiliate) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6 relative font-['DM_Sans']">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#FF6584] opacity-[0.05] blur-[150px] pointer-events-none"></div>
        
        <div className="w-full max-w-[500px] bg-[#121212] border border-[rgba(255,255,255,0.06)] rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(255,101,132,0.1)] flex items-center justify-center text-[#FF6584] mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-['Syne'] text-2xl font-bold mb-3">Parceria Inativa</h2>
          <p className="text-sm text-[rgba(240,240,240,0.55)] leading-relaxed mb-6">
            Você ainda não possui autorização de afiliado do **SlidOz** cadastrado nesta conta. 
            Entre em contato com o suporte para criar seu código e começar a faturar com indicações!
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="flex-1 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Painel
            </button>
            <a 
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'}?text=Ol%C3%A1%2C%20gostaria%20de%20ativar%20minha%20parceria%20de%20afiliado%20no%20SlidOz!`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-grow py-3 bg-gradient-to-r from-[#FF6584] to-[#6C63FF] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
            >
              Falar com Suporte
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] font-['DM_Sans'] pb-16 relative overflow-hidden">
      
      {/* GLOWING AMBIENTS */}
      <div className="absolute top-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#6C63FF] opacity-[0.06] blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#FF6584] opacity-[0.05] blur-[150px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,10,0.8)] backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6584] to-[#6C63FF] flex items-center justify-center shadow-md">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-['Syne'] font-bold text-lg leading-tight tracking-tight text-white">Painel de Afiliados</h1>
            <span className="text-[9px] uppercase font-bold text-[#FF6584] tracking-widest">Parceiro Oficial SlidOz</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="text-xs font-semibold px-4.5 py-2.5 border border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            Acessar SlidOz
          </button>
          <button 
            onClick={() => logout().then(() => navigate('/login'))}
            className="text-xs font-semibold px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        
        {/* WELCOME STRIP */}
        <section className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[rgba(22,22,22,0.4)] border border-[rgba(255,255,255,0.05)] p-6 md:p-8 rounded-3xl">
          <div>
            <h2 className="font-['Syne'] text-2xl font-bold text-white">Bem-vindo, {profile.name}!</h2>
            <p className="text-xs text-[rgba(240,240,240,0.5)] mt-1.5">
              Divulgue seu link de indicação exclusivo e ganhe <span className="text-[#FF6584] font-bold">{(profile.commissionRate || 0.5) * 100}% de comissão recorrente</span> por cada venda!
            </p>
          </div>

          {/* COPY LINK BOX */}
          <div className="flex items-center gap-2 bg-[#121212] border border-[rgba(255,255,255,0.07)] p-2.5 rounded-2xl md:max-w-md w-full">
            <div className="flex-1 text-xs font-mono text-[rgba(240,240,240,0.6)] px-2 truncate">
              {window.location.origin}/vendas?ref={profile.affiliateCode}
            </div>
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedLink 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gradient-to-r from-[#FF6584] to-[#6C63FF] text-white hover:opacity-90'
              }`}
            >
              {copiedLink ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </section>

        {/* METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {/* Card 1 */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-green-400" /> Saldo Disponível
              </span>
              <h3 className="font-['Syne'] text-3xl font-extrabold text-green-400 mt-2 font-mono">
                R$ {(profile.balanceAvailable || 0).toFixed(2)}
              </h3>
              <p className="text-[9px] text-[rgba(255,255,255,0.3)] mt-2">Liberado para saque PIX imediato</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-yellow-500" /> Saldo Pendente
              </span>
              <h3 className="font-['Syne'] text-3xl font-extrabold text-yellow-500 mt-2 font-mono">
                R$ {(profile.balancePending || 0).toFixed(2)}
              </h3>
              <p className="text-[9px] text-[rgba(255,255,255,0.3)] mt-2">Em período de garantia (7 dias)</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wider flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-[#6C63FF]" /> Vendas Totais
              </span>
              <h3 className="font-['Syne'] text-3xl font-extrabold text-white mt-2 font-mono">
                {commissions.length}
              </h3>
              <p className="text-[9px] text-[rgba(255,255,255,0.3)] mt-2">Indicações convertidas com sucesso</p>
            </div>
            <div className="w-12 h-12 bg-[rgba(108,99,255,0.1)] rounded-xl flex items-center justify-center text-[#6C63FF]">
              <Share2 className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* WORKSPACE CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: COMMISSION RECORDS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                <h3 className="font-['Syne'] font-bold text-white text-base">Extrato de Indicações</h3>
                <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">Histórico completo de comissões geradas por suas vendas</p>
              </div>

              {loadingData ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#FF6584] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">Buscando comissões...</span>
                </div>
              ) : commissions.length === 0 ? (
                <div className="py-16 text-center text-[rgba(255,255,255,0.4)] text-xs">
                  Você ainda não realizou nenhuma indicação de venda. Divulgue seu link para começar!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] text-[9px] uppercase font-bold text-[rgba(255,255,255,0.4)] tracking-wider">
                        <th className="py-4 px-6">Cliente</th>
                        <th className="py-4 px-4">Valor Venda</th>
                        <th className="py-4 px-4">Sua Comissão</th>
                        <th className="py-4 px-4">Data Compra</th>
                        <th className="py-4 px-4">Liberação</th>
                        <th className="py-4 px-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-xs">
                      {commissions.map((comm) => {
                        const relativeTime = getFormatDate(comm.createdAt);
                        const releaseDate = getFormatDate(comm.releaseDate);

                        return (
                          <tr key={comm.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-semibold text-white">{comm.buyerName}</div>
                              <div className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">{comm.buyerEmail}</div>
                            </td>
                            <td className="py-4 px-4 font-mono font-medium text-[rgba(255,255,255,0.7)]">
                              R$ {Number(comm.saleAmount).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-green-400 font-bold font-mono">
                              R$ {Number(comm.commissionAmount).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-[rgba(255,255,255,0.6)]">
                              {relativeTime}
                            </td>
                            <td className="py-4 px-4 text-[rgba(255,255,255,0.5)]">
                              {releaseDate}
                            </td>
                            <td className="py-4 px-6 text-right">
                              {comm.status === 'pending' && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                  EM GARANTIA
                                </span>
                              )}
                              {comm.status === 'available' && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                  LIBERADO
                                </span>
                              )}
                              {comm.status === 'paid' && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  SAQUE PAGO
                                </span>
                              )}
                              {comm.status === 'refunded' && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                  REEMBOLSADO
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: WITHDRAWAL FORM */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
              <h3 className="font-['Syne'] font-bold text-white text-base mb-4">Solicitar Saque PIX</h3>
              
              {formError && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRequestPayout} className="space-y-4">
                
                {/* AMOUNT */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider pl-1">Valor do Saque (R$)*</label>
                  <input
                    type="number"
                    placeholder="Mínimo R$ 10,00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={formLoading || (profile.balanceAvailable || 0) < 10}
                    step="0.01"
                    min="10"
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-xl py-3 px-4 text-xs font-mono outline-none text-white transition-all font-bold"
                    required
                  />
                  <span className="text-[9px] text-[rgba(255,255,255,0.4)] pl-1 block">
                    Máximo disponível: R$ {(profile.balanceAvailable || 0).toFixed(2)}
                  </span>
                </div>

                {/* PIX KEY TYPE */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider pl-1">Tipo de Chave PIX *</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    disabled={formLoading}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-xl py-3 px-3 text-xs outline-none text-white cursor-pointer"
                  >
                    <option value="cpf" className="bg-[#121212]">CPF</option>
                    <option value="email" className="bg-[#121212]">E-mail</option>
                    <option value="phone" className="bg-[#121212]">Telefone</option>
                    <option value="random" className="bg-[#121212]">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                {/* PIX KEY */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider pl-1">Chave PIX *</label>
                  <input
                    type="text"
                    placeholder="Sua chave PIX para recebimento"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    disabled={formLoading}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-xl py-3 px-4 text-xs font-mono outline-none text-white transition-all font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading || (profile.balanceAvailable || 0) < 10}
                  className="w-full py-3.5 bg-gradient-to-r from-[#FF6584] to-[#6C63FF] hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Solicitar Saque PIX
                    </>
                  )}
                </button>

              </form>
            </div>

            {/* WITHDRAWAL HISTORY */}
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
              <h3 className="font-['Syne'] font-bold text-white text-base mb-4">Pedidos de Saque</h3>
              
              {payoutsHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-[rgba(255,255,255,0.4)]">
                  Nenhum histórico de saques.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                  {payoutsHistory.map((payout) => {
                    const relativeTime = getFormatDate(payout.createdAt);

                    return (
                      <div 
                        key={payout.id} 
                        className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white font-mono">
                            R$ {Number(payout.amount).toFixed(2)}
                          </div>
                          <div className="text-[9px] text-[rgba(255,255,255,0.45)] mt-1">
                            {relativeTime} • Chave: {payout.pixKey}
                          </div>
                        </div>

                        <div>
                          {payout.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/10">
                              PENDENTE
                            </span>
                          )}
                          {payout.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-green-500/10 text-green-400 border border-green-500/10">
                              PAGO
                            </span>
                          )}
                          {payout.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-red-500/10 text-red-400 border border-red-500/10">
                              REJEITADO
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
      
      {/* GLOBAL FOOTER */}
      <footer className="py-10 text-center text-xs text-[rgba(240,240,240,0.3)] border-t border-[rgba(255,255,255,0.05)] mt-20">
        SlidOz © 2026 — Programa de Afiliados Oficial
      </footer>

      {/* COMPONENT ANIMATIONS INJECTIONS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

    </div>
  );
}
