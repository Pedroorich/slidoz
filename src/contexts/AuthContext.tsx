import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionType: 'monthly' | 'annual' | 'none';
  subscriptionActive: boolean;
  createdAt: any;
  expiresAt: any;
  whatsappNumber?: string;
  suspended?: boolean;
  referredBy?: string;
  isAffiliate?: boolean;
  affiliateCode?: string;
  pixKey?: string;
  pixKeyType?: string;
  commissionRate?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSubscriptionActive: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase() || '';

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        // Auto-correção: Se for o email do admin principal mas o cargo no banco não for admin, corrige automaticamente
        if (currentUser.email?.toLowerCase() === adminEmail && data.role !== 'admin') {
          await setDoc(userDocRef, { role: 'admin', subscriptionActive: true }, { merge: true });
          data.role = 'admin';
          data.subscriptionActive = true;
        }
        setProfile(data);
      } else {
        // Se o usuário logado for o admin principal, cria o documento dele no Firestore automaticamente
        if (currentUser.email?.toLowerCase() === adminEmail) {
          const expiresFarFuture = new Date();
          expiresFarFuture.setFullYear(expiresFarFuture.getFullYear() + 50); // Admin expira em 50 anos

          const newAdminProfile: UserProfile = {
            uid: currentUser.uid,
            name: 'Administrador SlidOz',
            email: currentUser.email,
            role: 'admin',
            subscriptionType: 'annual',
            subscriptionActive: true,
            createdAt: new Date(),
            expiresAt: expiresFarFuture,
            whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '',
            suspended: false
          };

          await setDoc(userDocRef, {
            ...newAdminProfile,
            createdAt: serverTimestamp(),
            expiresAt: expiresFarFuture
          });

          setProfile(newAdminProfile);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário no Firestore:', error);
      setProfile(null);
    }
  }, [adminEmail]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    setLoading(true);
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  // Verifica se a assinatura está ativa
  const isAdmin = profile?.role === 'admin';
  
  let isSubscriptionActive = false;
  if (profile) {
    if (isAdmin) {
      isSubscriptionActive = true;
    } else {
      const isNotSuspended = !profile.suspended;
      const isFlagActive = profile.subscriptionActive;
      
      // Validação do Timestamp do Firestore
      let isNotExpired = false;
      if (profile.expiresAt) {
        const expiryDate = profile.expiresAt.toDate 
          ? profile.expiresAt.toDate() 
          : new Date(profile.expiresAt);
        isNotExpired = expiryDate.getTime() > Date.now();
      }
      
      isSubscriptionActive = isNotSuspended && isFlagActive && isNotExpired;
    }
  }

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin,
    isSubscriptionActive,
    logout,
    refreshProfile
  }), [user, profile, loading, isAdmin, isSubscriptionActive, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
