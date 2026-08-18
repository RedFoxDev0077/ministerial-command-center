import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  Sparkles,
  Shield,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  role: z.enum(['ADMIN', 'GABINETE', 'REVISOR', 'LECTOR']),
  departmentId: z.string().min(1, 'Debe seleccionar un departamento'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface Department {
  id: string;
  name: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${API_URL}/departments`);

        if (response.ok) {
          const data = await response.json();
          setDepartments(data);
        } else {
          toast.error('Error al cargar departamentos', {
            description: 'No se pudieron cargar los departamentos. Por favor, recarga la página.',
          });
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error('Error de conexión', {
          description: 'No se pudo conectar con el servidor.',
        });
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          departmentId: data.departmentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar usuario');
      }

      setSuccess(true);

      toast.success('¡Registro exitoso!', {
        description: 'Tu cuenta ha sido creada. Redirigiendo al dashboard...',
        duration: 3000,
        icon: <UserPlus className="h-5 w-5" />,
        className: 'border-l-4 border-l-green-500',
      });

      // Auto login after successful registration
      setTimeout(async () => {
        await login(data.email, data.password, false);
        navigate('/dashboard');
      }, 1500);

    } catch (err: any) {
      const errorMessage = err.message || 'Error al registrar. Por favor, intente nuevamente.';
      setError(errorMessage);
      toast.error('Error en el registro', {
        description: errorMessage,
        duration: 4000,
        icon: <AlertCircle className="h-5 w-5" />,
        className: 'border-l-4 border-l-red-500',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero Section */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary via-primary/95 to-primary/80 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/office-building.jpg"
            alt="Office Building"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-primary/80"></div>
        </div>

        {/* Animated background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="space-y-8 animate-slide-in-right">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold leading-tight">
                Únete al Sistema
                <br />
                Ministerial
              </h2>
              <p className="text-xl text-primary-foreground/90 max-w-md leading-relaxed">
                Gestiona documentos, expedientes y flujos de firma de manera eficiente y segura
              </p>
            </div>

            <div className="space-y-4 pt-8">
              {[
                { icon: Shield, text: 'Acceso seguro y encriptado' },
                { icon: CheckCircle2, text: 'Aprobación rápida de cuenta' },
                { icon: Building2, text: 'Integración departamental' },
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

      {/* Right side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo and title */}
          <div className="text-center space-y-4 animate-slide-up">
            <div className="relative mx-auto w-20 h-20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-xl">
                <UserPlus className="h-10 w-10 text-primary-foreground animate-float" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-md animate-pulse">
                <Sparkles className="h-3 w-3 text-accent-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Crear Cuenta
              </h1>
              <p className="text-sm text-muted-foreground">
                Centro de Comando Ministerial
              </p>
            </div>
          </div>

          {/* Error/Success alert */}
          {error && (
            <Alert variant="destructive" className="animate-shake">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-success/10 text-success border-success animate-bounce-in">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                ¡Registro exitoso! Redirigiendo al dashboard...
              </AlertDescription>
            </Alert>
          )}

          {/* Registration form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="grid grid-cols-2 gap-4">
              {/* First name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  Nombre
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    placeholder="Juan"
                    className={`pl-10 transition-all duration-200 ${
                      errors.firstName
                        ? 'border-destructive focus-visible:ring-destructive'
                        : 'hover:border-primary/50 focus-visible:border-primary'
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-destructive animate-slide-down">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Apellido
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    placeholder="Pérez"
                    className={`pl-10 transition-all duration-200 ${
                      errors.lastName
                        ? 'border-destructive focus-visible:ring-destructive'
                        : 'hover:border-primary/50 focus-visible:border-primary'
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-xs text-destructive animate-slide-down">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
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
                <p className="text-xs text-destructive animate-slide-down">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Rol
              </Label>
              <div className="relative group">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors z-10" />
                <Select onValueChange={(value) => setValue('role', value as any)}>
                  <SelectTrigger className={`pl-10 ${errors.role ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LECTOR">Lector</SelectItem>
                    <SelectItem value="REVISOR">Revisor</SelectItem>
                    <SelectItem value="GABINETE">Gabinete</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.role && (
                <p className="text-xs text-destructive animate-slide-down">{errors.role.message}</p>
              )}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">
                Departamento
              </Label>
              <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors z-10" />
                <Select onValueChange={(value) => setValue('departmentId', value)} disabled={loadingDepartments || isSubmitting}>
                  <SelectTrigger className={`pl-10 ${errors.departmentId ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder={loadingDepartments ? "Cargando departamentos..." : "Seleccionar departamento"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay departamentos disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {errors.departmentId && (
                <p className="text-xs text-destructive animate-slide-down">{errors.departmentId.message}</p>
              )}
            </div>

            {/* Password */}
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
                <p className="text-xs text-destructive animate-slide-down">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Contraseña
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 transition-all duration-200 ${
                    errors.confirmPassword
                      ? 'border-destructive focus-visible:ring-destructive'
                      : 'hover:border-primary/50 focus-visible:border-primary'
                  }`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive animate-slide-down">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mt-6"
              disabled={isSubmitting || success}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Registrando...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Registro Exitoso
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Crear Cuenta
                </>
              )}
            </Button>

            {/* Login link */}
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
