import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/sonner';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Building2,
  Sparkles,
  Shield,
  CheckCircle2
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Get the return URL from navigation state (e.g., from public document view)
  const returnTo = (location.state as any)?.returnTo || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password, data.rememberMe);
      toast.success('¡Inicio de sesión exitoso!', {
        description: 'Bienvenido al Centro de Comando Ministerial',
        duration: 3000,
        icon: <CheckCircle2 className="h-5 w-5" />,
        className: 'border-l-4 border-l-green-500',
      });
      // Redirect to returnTo URL (from public document view) or default to dashboard
      navigate(returnTo);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión. Por favor, intente nuevamente.';
      setError(errorMessage);
      toast.error('Error al iniciar sesión', {
        description: errorMessage,
        duration: 4000,
        icon: <AlertCircle className="h-5 w-5" />,
        className: 'border-l-4 border-l-red-500',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo and title */}
          <div className="text-center space-y-4 animate-slide-up">
            <div className="relative mx-auto w-20 h-20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-xl">
                <Building2 className="h-10 w-10 text-primary-foreground animate-float" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-md animate-pulse">
                <Sparkles className="h-3 w-3 text-accent-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Bienvenido
              </h1>
              <p className="text-sm text-muted-foreground">
                Centro de Comando Ministerial
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                MTTSIA - Guinea Ecuatorial
              </p>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="animate-shake">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-4">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo Electrónico
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="usuario@mttsia.gob.gq"
                    className={`pl-10 transition-all duration-200 ${
                      errors.email
                        ? 'border-destructive focus-visible:ring-destructive'
                        : 'hover:border-primary/50 focus-visible:border-primary'
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive animate-slide-down">{errors.email.message}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 transition-all duration-200 ${
                      errors.password
                        ? 'border-destructive focus-visible:ring-destructive'
                        : 'hover:border-primary/50 focus-visible:border-primary'
                    }`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive animate-slide-down">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    {...register('rememberMe')}
                    disabled={isSubmitting}
                    className="transition-transform hover:scale-110"
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Recordar sesión (7 días)
                  </Label>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Iniciar Sesión
                </>
              )}
            </Button>

            {/* Register link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </form>

          {/* Demo credentials */}
          <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3 animate-slide-up backdrop-blur-sm" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Credenciales de prueba:
            </p>
            <div className="grid gap-2">
              {[
                { role: 'Admin', email: 'admin@mttsia.gob.gq', pass: 'Admin123!' },
                { role: 'Gabinete', email: 'gabinete@mttsia.gob.gq', pass: 'Gabinete123!' },
                { role: 'Revisor', email: 'revisor@mttsia.gob.gq', pass: 'Revisor123!' },
              ].map((cred, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs p-2 rounded hover:bg-background/50 transition-colors group"
                >
                  <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                  <span className="font-medium text-foreground">{cred.role}:</span>
                  <span className="text-muted-foreground truncate">{cred.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary via-primary/95 to-primary/80 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/government-building.jpg"
            alt="Government Building"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-primary/80"></div>
        </div>

        {/* Animated background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="space-y-8 animate-slide-in-right">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold leading-tight">
                Sistema de Gestión
                <br />
                Documental
              </h2>
              <p className="text-xl text-primary-foreground/90 max-w-md leading-relaxed">
                Plataforma centralizada para la gestión eficiente de documentos ministeriales
              </p>
            </div>

            <div className="space-y-4 pt-8">
              {[
                { icon: Shield, text: 'Seguridad de nivel empresarial' },
                { icon: CheckCircle2, text: 'Flujos de firma digital' },
                { icon: Building2, text: 'Gestión de expedientes' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 group animate-slide-in-right"
                  style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <p className="text-lg font-medium">{feature.text}</p>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-white/20">
              <p className="text-sm text-primary-foreground/70">
                © 2024 MTTSIA - Guinea Ecuatorial
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
