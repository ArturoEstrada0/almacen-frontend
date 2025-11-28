'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signIn } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Package } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (!loading && user && !redirecting) {
      console.log('[Login] Usuario detectado, redirigiendo a:', returnUrl);
      setRedirecting(true);
      router.push(returnUrl);
    }
  }, [user, loading, router, returnUrl, redirecting]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn(data);
      console.log('[Login] Login exitoso:', result);
      
      toast({
        title: 'Inicio de sesión exitoso',
        description: 'Bienvenido de vuelta',
      });
      
      // El useEffect detectará el cambio de user y redirigirá automáticamente
      // No necesitamos setIsLoading(false) porque nos vamos a redirigir
    } catch (error: any) {
      console.error('[Login] Error en login:', error);
      toast({
        title: 'Error',
        description: error.message || 'Credenciales inválidas',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sistema de Almacén
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...register('email')}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Sistema de Almacén
            </CardTitle>
            <CardDescription>
              Cargando...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
