'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { UserPermissions, DEFAULT_PERMISSIONS, PermissionModule } from '@/lib/types/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  permissions: UserPermissions | null;
  role: string | null;
  signOut: () => Promise<void>;
  hasPermission: (module: PermissionModule, action: keyof UserPermissions[PermissionModule]) => boolean;
  canCreate: (module: PermissionModule) => boolean;
  canRead: (module: PermissionModule) => boolean;
  canUpdate: (module: PermissionModule) => boolean;
  canDelete: (module: PermissionModule) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  permissions: null,
  role: null,
  signOut: async () => {},
  hasPermission: () => false,
  canCreate: () => false,
  canRead: () => false,
  canUpdate: () => false,
  canDelete: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Obtener sesión inicial
    console.log('[AuthContext] Obteniendo sesión inicial...');
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Sesión inicial:', session ? 'Sí' : 'No', session?.user?.email || '');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userRole = session.user.user_metadata?.role || 'viewer';
          const userPermissions = session.user.user_metadata?.permissions || DEFAULT_PERMISSIONS[userRole];
          console.log('[AuthContext] Role:', userRole);
          setRole(userRole);
          setPermissions(userPermissions);
        }
        
        setLoading(false);
      })
      .catch((error) => {
        console.error('[AuthContext] Error in getSession:', error);
        setLoading(false);
      });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session?.user?.email || 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'viewer';
        const userPermissions = session.user.user_metadata?.permissions || DEFAULT_PERMISSIONS[userRole];
        setRole(userRole);
        setPermissions(userPermissions);
      } else {
        setRole(null);
        setPermissions(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (
    module: PermissionModule,
    action: keyof UserPermissions[PermissionModule]
  ): boolean => {
    if (!permissions) return false;
    return permissions[module]?.[action] ?? false;
  };

  const canCreate = (module: PermissionModule) => hasPermission(module, 'create');
  const canRead = (module: PermissionModule) => hasPermission(module, 'read');
  const canUpdate = (module: PermissionModule) => hasPermission(module, 'update');
  const canDelete = (module: PermissionModule) => hasPermission(module, 'delete');

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPermissions(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      permissions, 
      role,
      signOut,
      hasPermission,
      canCreate,
      canRead,
      canUpdate,
      canDelete,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
