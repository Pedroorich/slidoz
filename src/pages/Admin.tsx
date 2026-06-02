import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { db, createNewUserAuth } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  where,
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  Users, 
  UserPlus, 
  DollarSign, 
  ShieldAlert, 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  Ban, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  Calendar, 
  Plus, 
  LogOut, 
  FileText,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  topic: string;
  numSlides: number;
  timestamp: any;
}

export default function Admin() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  // Estados dos dados
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'monthly' | 'annual'>('all');

  // Estados do formulário de criação de usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPlan, setNewUserPlan] = useState<'monthly' | 'annual'>('monthly');
  const [newUserWhatsapp, setNewUserWhatsapp] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado de ações em andamento
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'add' | 'logs' | 'affiliates' | 'payouts'>('users');

  // Estados para Afiliados e Saques
  const [affiliates, setAffiliates] = useState<UserProfile[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  // Estados para formulário de ativação de afiliado
  const [targetUserIdForAffiliate, setTargetUserIdForAffiliate] = useState('');
  const [newAffiliateCode, setNewAffiliateCode] = useState('');
  const [newAffiliateRate, setNewAffiliateRate] = useState(50); // 50% por padrão
  const [affiliateActionSuccess, setAffiliateActionSuccess] = useState<string | null>(null);
  const [affiliateActionError, setAffiliateActionError] = useState<string | null>(null);
  const [affiliateActionLoading, setAffiliateActionLoading] = useState(false);

  // Valores padrão de preços para estimar faturamento
  const MONTHLY_PRICE = 49.90; // R$ 49,90 por mês
  const ANNUAL_PRICE = 299.90; // R$ 299,90 por ano

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      // 1. Busca usuários
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: UserProfile[] = [];
      usersSnap.forEach((doc) => {
        usersList.push(doc.data() as UserProfile);
      });
      // Ordena por data de criação decrescente
      setUsers(usersList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      }));

      // 2. Busca histórico recente de atividades
      const logsQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(50));
      const logsSnap = await getDocs(logsQuery);
      const logsList: ActivityLog[] = [];
      logsSnap.forEach((doc) => {
        logsList.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setLogs(logsList);

      // 3. Busca Afiliados e Solicitações de Saque
      await loadAffiliatesAndPayouts(usersList);
    } catch (error) {
      console.error('Erro ao carregar dados do administrador:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAffiliatesAndPayouts = async (allUsersList?: UserProfile[]) => {
    try {
      // Carrega Afiliados (usuários com isAffiliate == true)
      const currentUsers = allUsersList || users;
      const affiliatesList = currentUsers.filter(u => u.isAffiliate === true);
      setAffiliates(affiliatesList);

      // Carrega solicitações de saque (payout_requests)
      const payoutSnap = await getDocs(collection(db, 'payout_requests'));
      const payoutList: any[] = [];
      payoutSnap.forEach((doc) => {
        payoutList.push({ id: doc.id, ...doc.data() });
      });
      // Ordena por data de criação decrescente
      setPayoutRequests(payoutList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      }));
    } catch (e) {
      console.error("Erro ao buscar afiliados ou saques:", e);
    }
  };

  const handleMakeAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserIdForAffiliate || !newAffiliateCode) {
      setAffiliateActionError('Selecione um usuário e insira um código único.');
      return;
    }
    
    setAffiliateActionLoading(true);
    setAffiliateActionError(null);
    setAffiliateActionSuccess(null);

    try {
      const trimmedCode = newAffiliateCode.trim().toLowerCase();
      // Verifica se o código já está em uso
      const codeQuery = query(
        collection(db, 'users'),
        where('affiliateCode', '==', trimmedCode),
        limit(1)
      );
      const codeSnap = await getDocs(codeQuery);
      if (!codeSnap.empty) {
        setAffiliateActionError('Este código de afiliado já está em uso por outro parceiro.');
        setAffiliateActionLoading(false);
        return;
      }

      const userRef = doc(db, 'users', targetUserIdForAffiliate);
      await updateDoc(userRef, {
        isAffiliate: true,
        affiliateCode: trimmedCode,
        commissionRate: newAffiliateRate / 100,
        balancePending: 0,
        balanceAvailable: 0
      });

      setAffiliateActionSuccess('Usuário promovido a Afiliado com sucesso!');
      setTargetUserIdForAffiliate('');
      setNewAffiliateCode('');
      
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      setAffiliateActionError(err.message || 'Erro ao promover afiliado.');
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const handleUpdateCommissionRate = async (uid: string, currentRate: number) => {
    const newRateStr = prompt("Digite a nova taxa de comissão em % (ex: 50 para 50%):", (currentRate * 100).toString());
    if (newRateStr === null) return;
    const rateVal = parseFloat(newRateStr);
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      alert("Taxa inválida. Digite um número entre 0 e 100.");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), {
        commissionRate: rateVal / 100
      });
      await loadAllData();
    } catch (e) {
      console.error("Erro ao atualizar taxa de comissão:", e);
    }
  };

  const handleDisableAffiliate = async (uid: string) => {
    if (!window.confirm("Deseja realmente desativar este afiliado? Ele perderá o código de rastreamento.")) {
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), {
        isAffiliate: false,
        affiliateCode: ""
      });
      await loadAllData();
    } catch (e) {
      console.error("Erro ao desativar afiliado:", e);
    }
  };

  const handleApprovePayout = async (payoutId: string, affiliateId: string, amount: number) => {
    if (!window.confirm(`Tem certeza de que deseja marcar este saque de R$ ${amount.toFixed(2)} como PAGO?\nCertifique-se de fazer a transferência PIX no app do seu banco antes de aprovar!`)) {
      return;
    }

    try {
      // 1. Atualiza status do saque
      await updateDoc(doc(db, 'payout_requests', payoutId), {
        status: 'approved',
        processedAt: serverTimestamp()
      });

      // 2. Deduz do saldo disponível do afiliado
      const affRef = doc(db, 'users', affiliateId);
      const affDoc = await getDoc(affRef);
      if (affDoc.exists()) {
        const affData = affDoc.data();
        const currentBalanceAvailable = affData.balanceAvailable || 0;
        await updateDoc(affRef, {
          balanceAvailable: Number((Math.max(0, currentBalanceAvailable - amount)).toFixed(2))
        });
      }

      alert("Saque aprovado e saldo atualizado com sucesso!");
      await loadAllData();
    } catch (e) {
      console.error("Erro ao aprovar saque:", e);
      alert("Erro ao aprovar saque.");
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    if (!window.confirm("Deseja rejeitar esta solicitação de saque?")) {
      return;
    }
    try {
      await updateDoc(doc(db, 'payout_requests', payoutId), {
        status: 'rejected',
        processedAt: serverTimestamp()
      });
      await loadAllData();
    } catch (e) {
      console.error("Erro ao rejeitar saque:", e);
    }
  };

  // Criação inteligente de novo lead (cliente)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setFormError('Preencha os campos obrigatórios: Nome, E-mail e Senha.');
      return;
    }
    if (newUserPassword.length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      // 1. Cria a conta no Firebase Auth sem deslogar o administrador
      const newUid = await createNewUserAuth(newUserEmail.trim(), newUserPassword);

      // 2. Calcula data de expiração
      const expiresAt = new Date();
      if (newUserPlan === 'monthly') {
        expiresAt.setDate(expiresAt.getDate() + 30);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 365);
      }

      // 2.1 Busca se há indicação de afiliado pendente para este e-mail
      let referredByCode = '';
      let leadDocId = null;
      try {
        const pendingLeadsRef = collection(db, 'pending_leads');
        const leadQuery = query(
          pendingLeadsRef, 
          where('email', '==', newUserEmail.trim().toLowerCase()),
          where('status', '==', 'pending'),
          limit(1)
        );
        const leadSnap = await getDocs(leadQuery);
        if (!leadSnap.empty) {
          const leadDoc = leadSnap.docs[0];
          referredByCode = leadDoc.data().referredBy || '';
          leadDocId = leadDoc.id;
        }
      } catch (err) {
        console.error('Erro ao buscar lead pendente:', err);
      }

      // 3. Salva os dados cadastrais no Firestore
      const userDocRef = doc(db, 'users', newUid);
      const newUserProfile: UserProfile = {
        uid: newUid,
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        role: 'user',
        subscriptionType: newUserPlan,
        subscriptionActive: true,
        createdAt: new Date(),
        expiresAt: expiresAt,
        whatsappNumber: newUserWhatsapp.replace(/\D/g, ''), // Salva apenas números
        suspended: false
      };

      if (referredByCode) {
        newUserProfile.referredBy = referredByCode;
      }

      await setDoc(userDocRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });

      // 3.1 Se houver afiliado indicador, registra a comissão correspondente
      if (referredByCode) {
        try {
          const affiliatesQuery = query(
            collection(db, 'users'),
            where('affiliateCode', '==', referredByCode),
            where('isAffiliate', '==', true),
            limit(1)
          );
          const affSnap = await getDocs(affiliatesQuery);
          if (!affSnap.empty) {
            const affDoc = affSnap.docs[0];
            const affiliateUid = affDoc.id;
            const affData = affDoc.data();
            const commissionRate = affData.commissionRate !== undefined ? affData.commissionRate : 0.50; // 50% padrão
            
            const saleAmount = newUserPlan === 'monthly' ? MONTHLY_PRICE : ANNUAL_PRICE;
            const commissionAmount = Number((saleAmount * commissionRate).toFixed(2));
            
            // Cria registro na coleção 'commissions'
            const commissionDocRef = doc(collection(db, 'commissions'));
            const releaseDate = new Date();
            releaseDate.setDate(releaseDate.getDate() + 7); // Garantia de 7 dias
            
            await setDoc(commissionDocRef, {
              commissionId: commissionDocRef.id,
              affiliateId: affiliateUid,
              buyerEmail: newUserEmail.trim().toLowerCase(),
              buyerName: newUserName.trim(),
              saleAmount: saleAmount,
              commissionAmount: commissionAmount,
              status: 'pending',
              createdAt: serverTimestamp(),
              releaseDate: releaseDate
            });

            // Atualiza saldo pendente do afiliado no documento do usuário
            const currentBalancePending = affData.balancePending || 0;
            await updateDoc(doc(db, 'users', affiliateUid), {
              balancePending: Number((currentBalancePending + commissionAmount).toFixed(2))
            });

            // Marca o lead pendente como aprovado para evitar duplicidade
            if (leadDocId) {
              await updateDoc(doc(db, 'pending_leads', leadDocId), {
                status: 'approved'
              });
            }
            console.log(`Comissão de R$ ${commissionAmount} atribuída com sucesso ao afiliado UID: ${affiliateUid}`);
          }
        } catch (err) {
          console.error('Erro ao processar comissão de afiliado:', err);
        }
      }

      // 4. Grava no log de auditoria
      const logDocRef = doc(collection(db, 'activity_logs'));
      await setDoc(logDocRef, {
        userId: newUid,
        userEmail: newUserProfile.email,
        userName: newUserProfile.name,
        action: 'account_created',
        topic: `Plano: ${newUserPlan === 'annual' ? 'Anual' : 'Mensal'}`,
        numSlides: 0,
        timestamp: serverTimestamp()
      });

      // Sucesso
      setFormSuccess(`Cliente "${newUserName}" criado com sucesso! Credenciais salvas no banco.`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserWhatsapp('');
      
      // Recarrega dados
      await loadAllData();
      
      // Volta para aba de lista após 2 segundos
      setTimeout(() => {
        setActiveTab('users');
        setFormSuccess(null);
      }, 2500);

    } catch (err: any) {
      console.error('Erro ao registrar cliente:', err);
      if (err.code === 'auth/email-already-in-use') {
        setFormError('Este e-mail já está sendo utilizado por outro usuário.');
      } else if (err.code === 'auth/invalid-email') {
        setFormError('O e-mail digitado possui formato inválido.');
      } else {
        setFormError(err.message || 'Erro desconhecido ao criar usuário.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Renova assinatura (+30 ou +365 dias a partir de hoje)
  const handleRenew = async (uid: string, days: number, planType: 'monthly' | 'annual') => {
    setActionLoadingId(uid);
    try {
      const userRef = doc(db, 'users', uid);
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + days);

      await updateDoc(userRef, {
        subscriptionActive: true,
        suspended: false,
        subscriptionType: planType,
        expiresAt: newExpiry
      });

      // Grava no log
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser) {
        const logDocRef = doc(collection(db, 'activity_logs'));
        await setDoc(logDocRef, {
          userId: uid,
          userEmail: targetUser.email,
          userName: targetUser.name,
          action: 'subscription_renewed',
          topic: `Renovado por +${days} dias (${planType === 'annual' ? 'Anual' : 'Mensal'})`,
          numSlides: 0,
          timestamp: serverTimestamp()
        });
      }

      await loadAllData();
    } catch (e) {
      console.error('Erro ao renovar assinatura:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Alterna status de suspensão
  const handleToggleSuspend = async (uid: string, currentSuspended: boolean) => {
    setActionLoadingId(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        suspended: !currentSuspended
      });

      // Grava no log
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser) {
        const logDocRef = doc(collection(db, 'activity_logs'));
        await setDoc(logDocRef, {
          userId: uid,
          userEmail: targetUser.email,
          userName: targetUser.name,
          action: !currentSuspended ? 'account_suspended' : 'account_activated',
          topic: !currentSuspended ? 'Acesso suspenso pelo admin' : 'Acesso reativado pelo admin',
          numSlides: 0,
          timestamp: serverTimestamp()
        });
      }

      await loadAllData();
    } catch (e) {
      console.error('Erro ao alterar suspensão:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Envia e-mail de redefinição de senha para o cliente
  const handleSendResetPassword = async (email: string) => {
    alert(`Um e-mail oficial de redefinição de senha será enviado do Firebase para: ${email}`);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('E-mail de redefinição de senha enviado com sucesso!');
    } catch (e: any) {
      console.error('Erro ao enviar e-mail de redefinição:', e);
      alert(`Erro: ${e.message}`);
    }
  };

  // Exclui documento do Firestore
  const handleDeleteUser = async (uid: string, email: string) => {
    if (!window.confirm(`Tem certeza absoluta que deseja excluir o cliente com o e-mail: ${email}? Ele perderá todo o histórico e acesso.`)) {
      return;
    }
    setActionLoadingId(uid);
    try {
      await deleteDoc(doc(db, 'users', uid));
      
      const logDocRef = doc(collection(db, 'activity_logs'));
      await setDoc(logDocRef, {
        userId: uid,
        userEmail: email,
        userName: 'Cliente Removido',
        action: 'account_deleted',
        topic: 'Documento excluído no banco de dados',
        numSlides: 0,
        timestamp: serverTimestamp()
      });

      await loadAllData();
    } catch (e) {
      console.error('Erro ao excluir usuário:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Auxiliares para verificar expiração
  const checkStatus = (u: UserProfile): 'active' | 'expired' | 'suspended' => {
    if (u.suspended) return 'suspended';
    
    if (u.expiresAt) {
      const expiryDate = u.expiresAt.toDate ? u.expiresAt.toDate() : new Date(u.expiresAt);
      if (expiryDate.getTime() < Date.now()) {
        return 'expired';
      }
    }
    return u.subscriptionActive ? 'active' : 'expired';
  };

  const getExpiryString = (expiresAt: any) => {
    if (!expiresAt) return 'Não definida';
    const date = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return date.toLocaleDateString('pt-BR');
  };

  const getRelativeTimeString = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin === 1) return 'Há 1 minuto';
    if (diffMin < 60) return `Há ${diffMin} minutos`;
    
    const diffHours = Math.round(diffMin / 60);
    if (diffHours === 1) return 'Há 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;

    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  };

  // Filtros aplicados em memória
  const filteredUsers = users.filter((u) => {
    // 1. Não mostra o próprio admin principal na tabela para evitar autoexclusão
    if (u.email.toLowerCase() === profile?.email?.toLowerCase()) return false;

    // 2. Busca por termo
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.whatsappNumber && u.whatsappNumber.includes(searchTerm));

    // 3. Status
    const status = checkStatus(u);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    // 4. Plano
    const matchesPlan = planFilter === 'all' || u.subscriptionType === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Estatísticas calculadas dinamicamente
  const stats = {
    totalLeads: users.filter(u => u.role !== 'admin').length,
    activeLeads: users.filter(u => u.role !== 'admin' && checkStatus(u) === 'active').length,
    expiredLeads: users.filter(u => u.role !== 'admin' && checkStatus(u) === 'expired').length,
    mrrEstimation: users.reduce((total, u) => {
      if (u.role === 'admin' || checkStatus(u) !== 'active') return total;
      if (u.subscriptionType === 'monthly') return total + MONTHLY_PRICE;
      if (u.subscriptionType === 'annual') return total + (ANNUAL_PRICE / 12); // Proporcional mensal
      return total;
    }, 0)
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] font-['DM_Sans'] pb-12 relative overflow-hidden">
      
      {/* GLOW BACKGROUND EFFECT */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#6C63FF] opacity-[0.06] blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-10%] w-[35vw] h-[35vw] rounded-full bg-[#FF6584] opacity-[0.04] blur-[150px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,10,0.8)] backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-['Syne'] font-bold text-lg leading-tight tracking-tight">Painel Admin SlidOz</h1>
            <span className="text-[10px] uppercase font-semibold text-[#6C63FF] tracking-wider">Gestão de Leads</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="text-xs font-semibold px-4 py-2 border border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            Acessar SlidOz
          </button>
          
          <button 
            onClick={() => logout()}
            className="p-2 text-red-400 hover:bg-[rgba(255,69,58,0.1)] rounded-xl transition-colors cursor-pointer"
            title="Deslogar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* WELCOME BANNER */}
        <section className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-['Syne'] text-2xl font-bold text-white">Gerenciamento Geral de Assinaturas</h2>
            <p className="text-sm text-[rgba(240,240,240,0.5)] mt-1">
              Olá, <span className="text-[#6C63FF] font-medium">{profile?.email}</span>. Acompanhe a saúde de suas vendas manuais da InfinitePay.
            </p>
          </div>
          
          <button
            onClick={loadAllData}
            disabled={loadingData}
            className="self-start md:self-auto px-4 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] rounded-xl text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            Sincronizar Banco
          </button>
        </section>

        {/* METRICS DASHBOARD */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          
          {/* CARD 1: TOTAL LEADS */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Clientes Cadastrados</span>
              <h3 className="font-['Syne'] text-2xl font-bold text-white mt-1">{stats.totalLeads}</h3>
              <p className="text-[10px] text-[rgba(255,255,255,0.3)] mt-2">Removendo administradores</p>
            </div>
            <div className="w-12 h-12 bg-[rgba(108,99,255,0.1)] rounded-xl flex items-center justify-center text-[#6C63FF]">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* CARD 2: ACTIVE LEADS */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Assinaturas Ativas</span>
              <h3 className="font-['Syne'] text-2xl font-bold text-green-400 mt-1">{stats.activeLeads}</h3>
              <p className="text-[10px] text-green-400/80 mt-2">Acesso liberado à IA</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* CARD 3: EXPIRED LEADS */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Acessos Vencidos</span>
              <h3 className="font-['Syne'] text-2xl font-bold text-red-400 mt-1">{stats.expiredLeads}</h3>
              <p className="text-[10px] text-red-400/80 mt-2">Aguardando renovação</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          {/* CARD 4: ESTIMATED MRR */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">MRR Estimado</span>
              <h3 className="font-['Syne'] text-2xl font-bold text-white mt-1">
                R$ {stats.mrrEstimation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-[rgba(255,255,255,0.3)] mt-2">Mensal: R$49,90 | Anual: R$299,90</p>
            </div>
            <div className="w-12 h-12 bg-[rgba(255,101,132,0.1)] rounded-xl flex items-center justify-center text-[#FF6584]">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

        </section>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)] mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'users' 
                ? 'border-[#6C63FF] text-[#6C63FF]' 
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Lista de Clientes ({filteredUsers.length})
          </button>
          
          <button
            onClick={() => setActiveTab('add')}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'add' 
                ? 'border-[#6C63FF] text-[#6C63FF]' 
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Novo Cliente
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'logs' 
                ? 'border-[#6C63FF] text-[#6C63FF]' 
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Histórico Global de Ações
          </button>

          <button
            onClick={() => setActiveTab('affiliates')}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'affiliates' 
                ? 'border-[#6C63FF] text-[#6C63FF]' 
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-[#FF6584]" />
            Gestão de Afiliados ({affiliates.length})
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'payouts' 
                ? 'border-[#6C63FF] text-[#6C63FF]' 
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 text-green-400" />
            Solicitações de Saque ({payoutRequests.filter(p => p.status === 'pending').length})
          </button>
        </div>

        {/* TAB 1: USERS LIST */}
        {activeTab === 'users' && (
          <section className="space-y-4">
            
            {/* FILTERS TOOLBAR */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4">
              
              {/* Search Bar */}
              <div className="md:col-span-6 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#6C63FF] rounded-xl py-2 pl-9 pr-4 text-xs outline-none transition-all placeholder-[rgba(255,255,255,0.3)] text-white"
                />
              </div>

              {/* Status Filter */}
              <div className="md:col-span-3 flex items-center gap-2">
                <span className="text-[10px] uppercase font-semibold text-[rgba(255,255,255,0.4)] whitespace-nowrap">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl py-2 px-3 text-xs outline-none text-white cursor-pointer"
                >
                  <option value="all" className="bg-[#121212]">Todos</option>
                  <option value="active" className="bg-[#121212]">Ativo (Acesso IA)</option>
                  <option value="expired" className="bg-[#121212]">Expirado</option>
                  <option value="suspended" className="bg-[#121212]">Suspenso Manual</option>
                </select>
              </div>

              {/* Plan Filter */}
              <div className="md:col-span-3 flex items-center gap-2">
                <span className="text-[10px] uppercase font-semibold text-[rgba(255,255,255,0.4)] whitespace-nowrap">Plano:</span>
                <select
                  value={planFilter}
                  onChange={(e: any) => setPlanFilter(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl py-2 px-3 text-xs outline-none text-white cursor-pointer"
                >
                  <option value="all" className="bg-[#121212]">Todos</option>
                  <option value="monthly" className="bg-[#121212]">Mensal (30 dias)</option>
                  <option value="annual" className="bg-[#121212]">Anual</option>
                </select>
              </div>

            </div>

            {/* USERS TABLE */}
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
              {loadingData ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">Buscando banco do Firebase...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-[rgba(255,255,255,0.4)]">
                  Nenhum cliente encontrado com os filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] text-[10px] uppercase font-bold text-[rgba(255,255,255,0.4)] tracking-wider">
                        <th className="py-4 px-6">Cliente / E-mail</th>
                        <th className="py-4 px-4">WhatsApp</th>
                        <th className="py-4 px-4">Plano</th>
                        <th className="py-4 px-4">Expira em</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-6 text-right">Ações de Gestão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-xs">
                      {filteredUsers.map((u) => {
                        const status = checkStatus(u);
                        const isActionLoading = actionLoadingId === u.uid;

                        return (
                          <tr key={u.uid} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                            
                            {/* Nome / Email */}
                            <td className="py-4 px-6">
                              <div className="font-semibold text-white">{u.name}</div>
                              <div className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium mt-0.5">{u.email}</div>
                            </td>

                            {/* WhatsApp */}
                            <td className="py-4 px-4 font-mono text-[11px] text-[rgba(255,255,255,0.8)]">
                              {u.whatsappNumber ? (
                                <a 
                                  href={`https://wa.me/${u.whatsappNumber}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline hover:text-[#25D366] transition-colors"
                                >
                                  +{u.whatsappNumber}
                                </a>
                              ) : (
                                <span className="text-[rgba(255,255,255,0.25)]">—</span>
                              )}
                            </td>

                            {/* Plano */}
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                                u.subscriptionType === 'annual' 
                                  ? 'bg-[#FF6584]/10 text-[#FF6584] border border-[#FF6584]/20' 
                                  : 'bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20'
                              }`}>
                                {u.subscriptionType === 'annual' ? 'ANUAL' : 'MENSAL'}
                              </span>
                            </td>

                            {/* Expira Em */}
                            <td className="py-4 px-4 text-[rgba(255,255,255,0.7)] font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                                {getExpiryString(u.expiresAt)}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              {status === 'active' && (
                                <span className="inline-flex items-center gap-1 text-green-400 font-semibold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Ativo
                                </span>
                              )}
                              {status === 'expired' && (
                                <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5" /> Expirado
                                </span>
                              )}
                              {status === 'suspended' && (
                                <span className="inline-flex items-center gap-1 text-yellow-500 font-semibold">
                                  <Ban className="w-3.5 h-3.5" /> Suspenso
                                </span>
                              )}
                            </td>

                            {/* Ações de Gestão */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                
                                {/* Renovar Mensal */}
                                <button
                                  onClick={() => handleRenew(u.uid, 30, 'monthly')}
                                  disabled={isActionLoading}
                                  className="px-2 py-1 bg-[#6C63FF]/15 hover:bg-[#6C63FF]/30 border border-[#6C63FF]/20 text-[#8C85FF] rounded font-semibold text-[10px] tracking-wide transition-all cursor-pointer disabled:opacity-50"
                                  title="Renovar Acesso por 30 dias"
                                >
                                  +30 DIAS
                                </button>

                                {/* Renovar Anual */}
                                <button
                                  onClick={() => handleRenew(u.uid, 365, 'annual')}
                                  disabled={isActionLoading}
                                  className="px-2 py-1 bg-[#FF6584]/15 hover:bg-[#FF6584]/30 border border-[#FF6584]/20 text-[#FF859F] rounded font-semibold text-[10px] tracking-wide transition-all cursor-pointer disabled:opacity-50"
                                  title="Renovar Acesso por 1 Ano"
                                >
                                  +ANUAL
                                </button>

                                {/* Bloquear/Desbloquear */}
                                <button
                                  onClick={() => handleToggleSuspend(u.uid, u.suspended || false)}
                                  disabled={isActionLoading}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    u.suspended 
                                      ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400' 
                                      : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500'
                                  }`}
                                  title={u.suspended ? 'Reativar Usuário' : 'Suspender Usuário Manualmente'}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>

                                {/* Link Redefinir Senha */}
                                <button
                                  onClick={() => handleSendResetPassword(u.email)}
                                  disabled={isActionLoading}
                                  className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors cursor-pointer"
                                  title="Enviar Link de Redefinição de Senha para Cliente"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>

                                {/* Excluir Documento */}
                                <button
                                  onClick={() => handleDeleteUser(u.uid, u.email)}
                                  disabled={isActionLoading}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer"
                                  title="Excluir Usuário permanentemente do banco"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </section>
        )}

        {/* TAB 2: ADD NEW USER */}
        {activeTab === 'add' && (
          <section className="max-w-xl mx-auto bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 md:p-8">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[rgba(108,99,255,0.1)] rounded-xl flex items-center justify-center text-[#6C63FF]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Syne'] font-bold text-lg text-white">Criar Conta para Novo Lead</h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">Insira os dados após receber o comprovante no WhatsApp</p>
              </div>
            </div>

            {/* FORM FEEDBACKS */}
            {formError && (
              <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-5 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {/* NOME CLIENTE */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Nome do cliente (ex: João Silva)"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  disabled={formLoading}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#6C63FF] rounded-xl py-3 px-4 text-xs outline-none text-white transition-all"
                  required
                />
              </div>

              {/* E-MAIL CLIENTE */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">E-mail de Login *</label>
                <input
                  type="email"
                  placeholder="email@cliente.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  disabled={formLoading}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#6C63FF] rounded-xl py-3 px-4 text-xs outline-none text-white transition-all"
                  required
                />
              </div>

              {/* SENHA PROVISÓRIA */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Senha Provisória *</label>
                <input
                  type="text"
                  placeholder="Mínimo 6 dígitos (ex: 123456)"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  disabled={formLoading}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#6C63FF] rounded-xl py-3 px-4 text-xs font-mono outline-none text-white transition-all"
                  required
                />
              </div>

              {/* WHATSAPP CLIENTE */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">WhatsApp com DDI/DDD</label>
                <input
                  type="text"
                  placeholder="Ex: 5511999999999"
                  value={newUserWhatsapp}
                  onChange={(e) => setNewUserWhatsapp(e.target.value)}
                  disabled={formLoading}
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#6C63FF] rounded-xl py-3 px-4 text-xs outline-none text-white transition-all"
                />
              </div>

              {/* PLAN TYPE SELECTION */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Período de Assinatura Contratado *</label>
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Monthly Box */}
                  <div
                    onClick={() => !formLoading && setNewUserPlan('monthly')}
                    className={`border p-4 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                      newUserPlan === 'monthly'
                        ? 'border-[#6C63FF] bg-[#6C63FF]/5 text-white'
                        : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.15)]'
                    }`}
                  >
                    <span className="font-semibold text-xs leading-none">MENSAL</span>
                    <span className="text-[9px] text-[rgba(255,255,255,0.4)] mt-1.5">Expira em 30 dias</span>
                  </div>

                  {/* Annual Box */}
                  <div
                    onClick={() => !formLoading && setNewUserPlan('annual')}
                    className={`border p-4 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                      newUserPlan === 'annual'
                        ? 'border-[#FF6584] bg-[#FF6584]/5 text-white'
                        : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.15)]'
                    }`}
                  >
                    <span className="font-semibold text-xs leading-none">ANUAL</span>
                    <span className="text-[9px] text-[rgba(255,255,255,0.4)] mt-1.5">Expira em 365 dias (1 ano)</span>
                  </div>

                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {formLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Registrar Cliente & Liberar Acesso
                  </>
                )}
              </button>

            </form>
          </section>
        )}

        {/* TAB 3: ACTIVITY LOGS */}
        {activeTab === 'logs' && (
          <section className="space-y-4">
            
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-['Syne'] font-bold text-white text-base">Logs Globais de Atividade</h3>
                  <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">Auditoria de uso da inteligência artificial SlidOz pelos clientes</p>
                </div>
                <div className="text-[10px] text-right font-medium text-[rgba(255,255,255,0.4)]">
                  Exibindo últimos 50 eventos
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-[rgba(255,255,255,0.4)] text-xs">
                  Nenhum log de atividade registrado no Firestore ainda.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {logs.map((log) => {
                    return (
                      <div 
                        key={log.id} 
                        className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          
                          {/* Log Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            log.action === 'account_created' ? 'bg-green-500/10 text-green-400' :
                            log.action === 'account_deleted' ? 'bg-red-500/10 text-red-400' :
                            log.action === 'subscription_renewed' ? 'bg-blue-500/10 text-blue-400' :
                            log.action === 'generate' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-[rgba(255,255,255,0.05)] text-white/70'
                          }`}>
                            {log.action === 'account_created' ? <UserPlus className="w-4 h-4" /> :
                             log.action === 'account_deleted' ? <Trash2 className="w-4 h-4" /> :
                             log.action === 'subscription_renewed' ? <CheckCircle className="w-4 h-4" /> :
                             log.action === 'generate' ? <FileText className="w-4 h-4" /> :
                             <Activity className="w-4 h-4" />}
                          </div>

                          <div>
                            {/* User details & Action */}
                            <div>
                              <span className="font-semibold text-white">{log.userName}</span>
                              <span className="text-[rgba(255,255,255,0.45)]"> ({log.userEmail}) </span>
                              
                              {log.action === 'account_created' && <span className="text-green-400 font-medium">foi cadastrado</span>}
                              {log.action === 'account_deleted' && <span className="text-red-400 font-medium">teve a conta deletada</span>}
                              {log.action === 'account_suspended' && <span className="text-yellow-500 font-medium">foi suspenso manualmente</span>}
                              {log.action === 'account_activated' && <span className="text-green-400 font-medium">foi reativado</span>}
                              {log.action === 'subscription_renewed' && <span className="text-blue-400 font-medium">assinatura renovada</span>}
                              {log.action === 'generate' && <span className="text-purple-400 font-medium">gerou um carrossel</span>}
                              {log.action === 'export_image' && <span className="text-yellow-400 font-medium">exportou imagens</span>}
                              {log.action === 'export_pdf' && <span className="text-cyan-400 font-medium">exportou PDF</span>}
                              {log.action === 'login' && <span className="text-white/60">fez login</span>}
                            </div>

                            {/* Additional Context (Theme generated, slides, etc.) */}
                            {log.topic && (
                              <div className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium mt-1">
                                {log.numSlides > 0 ? `Tema: "${log.topic}" • ${log.numSlides} slides` : `${log.topic}`}
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Relative Time */}
                        <div className="text-[10px] text-[rgba(255,255,255,0.35)] font-mono whitespace-nowrap self-start sm:self-auto">
                          {getRelativeTimeString(log.timestamp)}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </section>
        )}

        {/* TAB 4: GESTÃO DE AFILIADOS */}
        {activeTab === 'affiliates' && (
          <section className="space-y-8 animate-fadeIn">
            {/* FORM TO PROMOTE USER TO AFFILIATE */}
            <div className="max-w-xl mx-auto bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[rgba(255,101,132,0.1)] rounded-xl flex items-center justify-center text-[#FF6584]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-['Syne'] font-bold text-lg text-white">Promover Usuário a Afiliado</h3>
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">Dê permissão para o usuário indicar e lucrar</p>
                </div>
              </div>

              {affiliateActionError && (
                <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 animate-[shake_0.4s_ease-in-out]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{affiliateActionError}</span>
                </div>
              )}

              {affiliateActionSuccess && (
                <div className="mb-5 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{affiliateActionSuccess}</span>
                </div>
              )}

              <form onSubmit={handleMakeAffiliate} className="space-y-4">
                {/* SELECT USER */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Selecionar Usuário *</label>
                  <select
                    value={targetUserIdForAffiliate}
                    onChange={(e) => setTargetUserIdForAffiliate(e.target.value)}
                    disabled={affiliateActionLoading}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl py-3 px-4 text-xs outline-none text-white cursor-pointer"
                    required
                  >
                    <option value="" className="bg-[#121212]">Selecione um usuário...</option>
                    {users.filter(u => u.role !== 'admin' && !u.isAffiliate).map(u => (
                      <option key={u.uid} value={u.uid} className="bg-[#121212]">{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* REFERRAL CODE */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Código Exclusivo *</label>
                    <input
                      type="text"
                      placeholder="Ex: pedro50"
                      value={newAffiliateCode}
                      onChange={(e) => setNewAffiliateCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      disabled={affiliateActionLoading}
                      className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#FF6584] rounded-xl py-3 px-4 text-xs outline-none text-white transition-all font-semibold"
                      required
                    />
                  </div>

                  {/* COMMISSION RATE */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Comissão (%) *</label>
                    <input
                      type="number"
                      placeholder="Ex: 50"
                      value={newAffiliateRate}
                      onChange={(e) => setNewAffiliateRate(Number(e.target.value))}
                      disabled={affiliateActionLoading}
                      min="1"
                      max="100"
                      className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-[#FF6584] rounded-xl py-3 px-4 text-xs outline-none text-white transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={affiliateActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#FF6584] to-[#6C63FF] hover:opacity-95 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {affiliateActionLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Ativar Parceiro Afiliado
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* LIST OF ACTIVE AFFILIATES */}
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                <h3 className="font-['Syne'] font-bold text-white text-base">Afiliados Ativos</h3>
                <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">Parceiros com permissão de rastreamento de vendas no SlidOz</p>
              </div>

              {affiliates.length === 0 ? (
                <div className="py-16 text-center text-[rgba(255,255,255,0.4)] text-xs">
                  Nenhum parceiro promovido a afiliado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] text-[10px] uppercase font-bold text-[rgba(255,255,255,0.4)] tracking-wider">
                        <th className="py-4 px-6">Parceiro / E-mail</th>
                        <th className="py-4 px-4">Código (Link)</th>
                        <th className="py-4 px-4">Taxa Comissão</th>
                        <th className="py-4 px-4">Saldo Pendente</th>
                        <th className="py-4 px-4">Saldo Disponível</th>
                        <th className="py-4 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-xs">
                      {affiliates.map((aff) => {
                        return (
                          <tr key={aff.uid} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-semibold text-white">{aff.name}</div>
                              <div className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium mt-0.5">{aff.email}</div>
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-[#FF6584]">
                              {aff.affiliateCode}
                            </td>
                            <td className="py-4 px-4 font-medium text-white">
                              {Number((aff.commissionRate || 0.5) * 100)}%
                            </td>
                            <td className="py-4 px-4 text-yellow-500 font-semibold font-mono">
                              R$ {(aff.balancePending || 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-green-400 font-semibold font-mono">
                              R$ {(aff.balanceAvailable || 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleUpdateCommissionRate(aff.uid, aff.commissionRate || 0.5)}
                                  className="px-2 py-1.5 bg-[#6C63FF]/15 hover:bg-[#6C63FF]/30 border border-[#6C63FF]/20 text-[#8C85FF] rounded font-semibold text-[10px] tracking-wide transition-all cursor-pointer"
                                  title="Alterar Taxa de Comissão"
                                >
                                  AJUSTAR COMISSÃO
                                </button>
                                <button
                                  onClick={() => handleDisableAffiliate(aff.uid)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer"
                                  title="Remover Permissão de Afiliado"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 5: SOLICITAÇÕES DE SAQUE */}
        {activeTab === 'payouts' && (
          <section className="space-y-4 animate-fadeIn">
            <div className="bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                <h3 className="font-['Syne'] font-bold text-white text-base">Solicitações de Transferência PIX</h3>
                <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">Aprove e dê baixa nos pagamentos de comissão liberados</p>
              </div>

              {payoutRequests.length === 0 ? (
                <div className="py-16 text-center text-[rgba(255,255,255,0.4)] text-xs">
                  Nenhuma solicitação de saque cadastrada no sistema.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] text-[10px] uppercase font-bold text-[rgba(255,255,255,0.4)] tracking-wider">
                        <th className="py-4 px-6">Afiliado</th>
                        <th className="py-4 px-4">Chave PIX</th>
                        <th className="py-4 px-4">Valor Solicitado</th>
                        <th className="py-4 px-4">Data Solicitação</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-6 text-right">Ações de Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-xs">
                      {payoutRequests.map((req) => {
                        const affDetails = users.find(u => u.uid === req.affiliateId);
                        const relativeTime = getRelativeTimeString(req.createdAt);

                        return (
                          <tr key={req.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-semibold text-white">{affDetails?.name || 'Parceiro Desconhecido'}</div>
                              <div className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium mt-0.5">{affDetails?.email || ''}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-mono font-bold text-white max-w-[200px] truncate" title={req.pixKey}>
                                {req.pixKey}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-green-400 font-bold font-mono text-sm">
                              R$ {Number(req.amount).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-[rgba(255,255,255,0.6)]">
                              {relativeTime}
                            </td>
                            <td className="py-4 px-4">
                              {req.status === 'pending' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                  AGUARDANDO
                                </span>
                              )}
                              {req.status === 'approved' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                  PAGO
                                </span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                  REJEITADO
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              {req.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApprovePayout(req.id, req.affiliateId, req.amount)}
                                    className="px-2.5 py-1.5 bg-green-500/15 hover:bg-green-500/35 border border-green-500/20 text-green-400 rounded font-semibold text-[10px] tracking-wide transition-all cursor-pointer"
                                    title="Marcar como pago via PIX"
                                  >
                                    APROVAR PIX
                                  </button>
                                  <button
                                    onClick={() => handleRejectPayout(req.id)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer"
                                    title="Rejeitar Solicitação"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[rgba(255,255,255,0.35)] font-semibold text-[10px]">
                                  CONCLUÍDO
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
          </section>
        )}

      </main>
    </div>
  );
}
