import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  Shield,
  Zap,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Lock,
  BarChart3,
  FileCheck,
  Globe,
  Award,
} from 'lucide-react';
import '@/styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'Gestión Documental Completa',
      description:
        'Administre documentos oficiales con flujos de trabajo estructurados de entrada y salida.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: Shield,
      title: 'Seguridad y Auditoría',
      description:
        'Control de acceso basado en roles con registro completo de todas las acciones del sistema.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      gradient: 'from-green-500 to-green-600',
    },
    {
      icon: Zap,
      title: 'Automatización con IA',
      description:
        'OCR automático, resúmenes inteligentes y generación de decretos con inteligencia artificial.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: Users,
      title: 'Protocolo de Firma',
      description:
        'Sistema de firma ministerial con 8 etapas y aplicación de sello oficial integrada.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      icon: Clock,
      title: 'Plazos y Recordatorios',
      description:
        'Gestión de plazos con cálculo de horas hábiles y recordatorios automáticos por email.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      gradient: 'from-red-500 to-red-600',
    },
    {
      icon: BarChart3,
      title: 'Expedientes y Casos',
      description:
        'Agrupe documentos relacionados en expedientes para seguimiento integral de casos.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  const stats = [
    { value: '11', label: 'Etapas de Entrada', icon: FileCheck },
    { value: '6', label: 'Etapas de Salida', icon: FileText },
    { value: '4', label: 'Roles de Usuario', icon: Users },
    { value: '100%', label: 'Auditoría', icon: Shield },
  ];

  const workflows = [
    {
      title: 'Flujo de Documentos Entrantes',
      stages: [
        'Entrada Manual',
        'Recepción',
        'Registro',
        'Distribución',
        'Análisis',
        'Borrador de Respuesta',
        'Revisión',
        'Protocolo de Firma',
        'Acuse de Recibo',
        'Archivo',
      ],
    },
    {
      title: 'Flujo de Documentos Salientes',
      stages: [
        'Borrador',
        'Revisión',
        'Protocolo de Firma',
        'Impresión y Envío',
        'Archivo',
      ],
    },
  ];

  const benefits = [
    {
      icon: Globe,
      title: 'Sistema Centralizado',
      description: 'Acceso unificado a todos los documentos ministeriales',
    },
    {
      icon: Award,
      title: 'Cumplimiento Legal',
      description: 'Cumple con estándares gubernamentales de Guinea Ecuatorial',
    },
    {
      icon: Lock,
      title: 'Máxima Seguridad',
      description: 'Encriptación y protección de datos sensibles del gobierno',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-green-800">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/images/landing/government-building.jpg)',
              opacity: 0.15,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/90 via-red-700/90 to-green-800/90" />
        </div>

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
                linear-gradient(45deg, transparent 48%, rgba(255, 255, 255, 0.1) 50%, transparent 52%)
              `,
              backgroundSize: '100% 100%, 100% 100%, 20px 20px',
              animation: 'drift 20s ease-in-out infinite',
            }}
          />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-white space-y-8 animate-fade-in-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300 animate-slide-in-left">
                <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                <span className="text-sm font-medium">Powered by AI</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight animate-fade-in-up animation-delay-200">
                Centro de Mando
                <br />
                <span className="text-green-300 animate-glow">Ministerial</span>
              </h1>

              {/* Subheading */}
              <p className="text-xl text-slate-200 leading-relaxed max-w-xl animate-fade-in-up animation-delay-400">
                Sistema avanzado de gestión documental para el Ministerio de Transportes,
                Telecomunicaciones y Sistemas de Inteligencia Artificial de Guinea Ecuatorial.
              </p>

              {/* Feature Highlights */}
              <div className="flex flex-wrap gap-4 animate-fade-in-up animation-delay-600">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="text-sm font-medium">OCR Automático</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="text-sm font-medium">Firma Digital</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="text-sm font-medium">Auditoría Total</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 animate-fade-in-up animation-delay-800">
                <Button
                  size="lg"
                  className="bg-white text-red-700 hover:bg-slate-100 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:scale-105"
                  onClick={() => navigate('/login')}
                >
                  Acceder al Sistema
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 hover:scale-105 transition-all duration-300"
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Ver Características
                </Button>
              </div>

              {/* Ministry Badge */}
              <div className="pt-4 border-t border-white/20 animate-fade-in-up animation-delay-1000">
                <p className="text-sm text-slate-300 mb-2">República de Guinea Ecuatorial</p>
                <p className="text-xs text-slate-400">
                  Ministerio de Transportes, Telecomunicaciones y Sistemas de Inteligencia
                  Artificial
                </p>
              </div>
            </div>

            {/* Right Column - Visual Element */}
            <div className="hidden lg:block animate-fade-in-right">
              <div className="relative">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl transform rotate-3 animate-pulse-slow" />

                {/* Main card */}
                <Card className="relative bg-white/95 backdrop-blur-sm border-white/50 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 hover:scale-105">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {/* Mock document header */}
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-green-600 rounded-lg flex items-center justify-center animate-glow-pulse">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Documento Oficial
                            </p>
                            <p className="text-xs text-slate-500">025-MT-038-051</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-green-600 animate-pulse" />
                          <span className="text-xs font-medium text-green-600">Firmado</span>
                        </div>
                      </div>

                      {/* Mock workflow stages */}
                      <div className="space-y-3">
                        {['Registro', 'Distribución', 'Análisis', 'Revisión', 'Firma'].map(
                          (stage, index) => (
                            <div
                              key={stage}
                              className="flex items-center gap-3 animate-slide-in-right"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                  index < 4
                                    ? 'bg-green-100 text-green-600 animate-bounce-subtle'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {index < 4 ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs font-bold">{index + 1}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700">{stage}</p>
                                {index < 4 && (
                                  <p className="text-xs text-slate-500">Completado</p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {/* Mock AI badge */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-purple-600 animate-pulse">
                          <Sparkles className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            Análisis con IA completado
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Floating badges */}
                <div className="absolute -top-6 -right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-xl text-sm font-bold transform rotate-12 animate-bounce-slow">
                  100% Seguro
                </div>
                <div className="absolute -bottom-6 -left-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl text-sm font-bold transform -rotate-12 animate-pulse">
                  IA Integrada
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="rgb(248, 250, 252)"
            />
          </svg>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up group cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <Icon className="h-8 w-8 mx-auto mb-3 text-red-600 group-hover:scale-110 transition-transform" />
                  <p className="text-4xl font-bold text-red-600 mb-2 group-hover:scale-110 transition-transform">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-600">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Features Section with Background */}
      <div id="features" className="relative py-24">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/images/landing/ai-technology.jpg)',
              opacity: 0.05,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 10% 20%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 90% 80%, rgba(22, 163, 74, 0.03) 0%, transparent 50%)
              `,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Características Principales
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Un sistema completo diseñado para gestionar documentos oficiales con eficiencia,
            seguridad y tecnología de vanguardia.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group hover:shadow-2xl transition-all duration-500 border-2 hover:border-red-200 overflow-hidden animate-fade-in-up hover:-translate-y-2 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`h-2 bg-gradient-to-r ${feature.gradient}`} />
                <CardContent className="p-6 relative">
                  {/* Background pattern */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity"
                    style={{
                      backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                      backgroundSize: '10px 10px',
                    }}
                  />

                  <div
                    className={`h-14 w-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}
                  >
                    <Icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-red-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>

                  {/* Hover indicator */}
                  <div className="mt-4 flex items-center text-sm text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-medium">Más información</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative bg-slate-50 py-16 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/images/landing/professional-office.jpg)',
              opacity: 0.08,
            }}
          />
          <div className="absolute inset-0 bg-slate-50/85" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="text-center animate-fade-in-up hover:scale-105 transition-transform duration-300"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-green-600 mb-4 shadow-lg animate-glow-pulse">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-slate-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workflows Section */}
      <div className="relative bg-gradient-to-b from-white to-slate-50 py-24 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/images/landing/document-workflow.jpg)',
              opacity: 0.06,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-slate-50/90" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Flujos de Trabajo Estructurados
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Procesos bien definidos para documentos entrantes y salientes con seguimiento
              completo en cada etapa.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {workflows.map((workflow, wIndex) => (
              <Card
                key={workflow.title}
                className="bg-white shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden animate-fade-in-up hover:-translate-y-2"
                style={{ animationDelay: `${wIndex * 200}ms` }}
              >
                <div className="h-2 bg-gradient-to-r from-red-500 to-green-600" />
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">{workflow.title}</h3>
                  <div className="space-y-3">
                    {workflow.stages.map((stage, index) => (
                      <div
                        key={stage}
                        className="flex items-center gap-4 group hover:translate-x-2 transition-transform duration-300"
                      >
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-red-500 to-green-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg group-hover:scale-110 transition-transform">
                          {index + 1}
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-lg px-4 py-3 group-hover:bg-gradient-to-r group-hover:from-red-50 group-hover:to-green-50 transition-all duration-300">
                          <p className="font-medium text-slate-900">{stage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-green-800 py-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)
              `,
              animation: 'drift 15s ease-in-out infinite',
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 animate-fade-in-up">
            Listo para Modernizar su Gestión Documental
          </h2>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Acceda al sistema y comience a gestionar documentos oficiales con tecnología de
            última generación.
          </p>
          <div className="flex flex-wrap gap-4 justify-center animate-fade-in-up animation-delay-400">
            <Button
              size="lg"
              className="bg-white text-red-700 hover:bg-slate-100 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:scale-105"
              onClick={() => navigate('/login')}
            >
              Iniciar Sesión
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* National Motto */}
          <div className="mt-12 pt-8 border-t border-white/20 animate-fade-in-up animation-delay-600">
            <p className="text-2xl font-bold text-green-300 mb-2 animate-glow">
              POR UNA GUINEA MEJOR
            </p>
            <p className="text-sm text-slate-300">República de Guinea Ecuatorial</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in-up">
            <p className="text-lg font-semibold mb-2">Centro de Mando Ministerial</p>
            <p className="text-sm text-slate-400 mb-4">
              Ministerio de Transportes, Telecomunicaciones y Sistemas de Inteligencia
              Artificial
            </p>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Gobierno de Guinea Ecuatorial. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
