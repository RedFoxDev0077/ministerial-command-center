import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, FileCheck, AlertTriangle, CheckCircle2, XCircle, Info, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SecurityPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Seguridad de Archivos"
        description="Sistema de protección y validación de archivos"
        icon={Shield}
      />

      {/* Admin Panel Access Card */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Panel de Administración
              </h3>
              <p className="text-sm text-muted-foreground">
                Revisa archivos marcados con alertas de seguridad, aprueba o rechaza archivos sospechosos,
                y accede a estadísticas detalladas de seguridad del sistema.
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/security')}
              className="ml-4 gap-2"
            >
              Abrir Panel
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Type Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Detección de Tipo de Archivo
            </CardTitle>
            <CardDescription>
              Análisis automático usando firmas digitales (magic numbers)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Detección Verdadera</p>
                <p className="text-xs text-muted-foreground">
                  Lee el contenido del archivo, no solo la extensión
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Prevención de Spoofing</p>
                <p className="text-xs text-muted-foreground">
                  Detecta archivos maliciosos renombrados (ej: virus.exe → document.pdf)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Validación de MIME Type</p>
                <p className="text-xs text-muted-foreground">
                  Compara tipo declarado vs tipo detectado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Reglas de Seguridad
            </CardTitle>
            <CardDescription>
              Protección automática contra archivos peligrosos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Tipos Permitidos</p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, Excel, PowerPoint, Imágenes, Texto
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Tipos Bloqueados</p>
                <p className="text-xs text-muted-foreground">
                  Ejecutables (.exe), Scripts (.bat, .sh, .ps1), Malware
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Revisión Manual</p>
                <p className="text-xs text-muted-foreground">
                  Archivos desconocidos o sospechosos marcados para admins
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Cómo Funciona
          </CardTitle>
          <CardDescription>
            Proceso automático de validación en cada carga de archivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-blue-600">1</span>
              </div>
              <p className="text-sm font-medium mb-1">Usuario Sube Archivo</p>
              <p className="text-xs text-muted-foreground">
                A través del formulario de nuevo documento
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-green-600">2</span>
              </div>
              <p className="text-sm font-medium mb-1">Detección Automática</p>
              <p className="text-xs text-muted-foreground">
                El sistema lee el contenido y detecta el tipo real
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-yellow-600">3</span>
              </div>
              <p className="text-sm font-medium mb-1">Validación</p>
              <p className="text-xs text-muted-foreground">
                Compara con reglas de seguridad y detecta anomalías
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-purple-600">4</span>
              </div>
              <p className="text-sm font-medium mb-1">Acción</p>
              <p className="text-xs text-muted-foreground">
                Permite, rechaza o marca para revisión
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Alert className="border-green-200 bg-green-50/50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-sm text-green-900">
          <strong>Sistema Activo:</strong> Todos los archivos subidos al sistema son
          automáticamente validados. Los tipos peligrosos son rechazados inmediatamente
          y los administradores reciben notificaciones sobre archivos sospechosos.
        </AlertDescription>
      </Alert>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información Adicional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">¿Dónde se aplica la seguridad?</h4>
            <p className="text-sm text-muted-foreground">
              La validación de archivos se activa automáticamente en:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Nuevo Documento (/new-entry) - al subir archivos adjuntos</li>
              <li>Bandeja de Entrada - al registrar nuevas entradas con archivos</li>
              <li>Bandeja de Salida - al preparar documentos para envío</li>
              <li>Cualquier formulario que permita carga de archivos</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Campos de Seguridad en Base de Datos</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Cada archivo almacena la siguiente metadata de seguridad:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/50 rounded">
                <span className="font-mono font-semibold">detectedMimeType</span>
                <span className="text-muted-foreground ml-2">Tipo real detectado</span>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <span className="font-mono font-semibold">declaredMimeType</span>
                <span className="text-muted-foreground ml-2">Tipo declarado</span>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <span className="font-mono font-semibold">typeMismatch</span>
                <span className="text-muted-foreground ml-2">¿Tipos no coinciden?</span>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <span className="font-mono font-semibold">isSecure</span>
                <span className="text-muted-foreground ml-2">Estado de seguridad</span>
              </div>
              <div className="p-2 bg-muted/50 rounded col-span-full">
                <span className="font-mono font-semibold">securityFlags[]</span>
                <span className="text-muted-foreground ml-2">Banderas de advertencia</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Funcionalidades Implementadas</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Panel de administración para revisar archivos marcados (accesible arriba)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Estadísticas de seguridad (archivos seguros, marcados, pendientes de revisión)</span>
              </li>
            </ul>
            <h4 className="text-sm font-semibold mt-4 mb-2">Próximas Funcionalidades</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Exportar informes de seguridad en PDF</li>
              <li>Configuración personalizada de reglas por departamento</li>
              <li>Notificaciones en tiempo real para archivos sospechosos</li>
              <li>Historial de decisiones de seguridad</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
