import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Power,
  Smartphone,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import { whatsappApi, type WaStatus, type WaActivity, type WaUser } from '@/lib/api/whatsapp.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: WaStatus['status'] }) {
  if (status === 'CONNECTED')
    return <Badge className="bg-green-500 text-white gap-1"><Wifi className="w-3 h-3" /> Conectado</Badge>;
  if (status === 'QR_READY')
    return <Badge className="bg-yellow-500 text-white gap-1"><Smartphone className="w-3 h-3" /> Esperando QR</Badge>;
  if (status === 'INITIALIZING')
    return <Badge className="bg-blue-500 text-white gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Iniciando</Badge>;
  return <Badge variant="secondary" className="gap-1"><WifiOff className="w-3 h-3" /> Desconectado</Badge>;
}

const COMMANDS = [
  { cmd: 'ayuda', desc: 'Ver todos los comandos' },
  { cmd: 'pendientes', desc: 'Documentos pendientes' },
  { cmd: 'urgentes', desc: 'Documentos urgentes' },
  { cmd: 'plazos', desc: 'Plazos de hoy' },
  { cmd: 'agenda', desc: 'Agenda de hoy' },
  { cmd: 'estado [número]', desc: 'Estado de documento' },
  { cmd: 'buscar [texto]', desc: 'Buscar documentos' },
  { cmd: 'estadísticas', desc: 'Resumen general' },
];

export default function WhatsAppBot() {
  const qc = useQueryClient();
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: whatsappApi.getStatus,
    refetchInterval: pollingEnabled ? 4000 : false,
  });

  const { data: activityData } = useQuery({
    queryKey: ['whatsapp-activity'],
    queryFn: whatsappApi.getActivity,
    refetchInterval: 8000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['whatsapp-users'],
    queryFn: whatsappApi.getUsers,
  });

  // Stop polling QR once connected
  useEffect(() => {
    if (statusData?.status === 'CONNECTED') {
      setPollingEnabled(false);
      setTimeout(() => setPollingEnabled(true), 30000); // re-poll every 30s when connected
    } else {
      setPollingEnabled(true);
    }
  }, [statusData?.status]);

  const disconnectMutation = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: () => {
      toast.success('WhatsApp desconectado');
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: whatsappApi.reconnect,
    onSuccess: () => {
      toast.success('Reconectando WhatsApp...');
      setPollingEnabled(true);
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  const status = statusData?.status ?? 'DISCONNECTED';
  const qrUrl = statusData?.qr;
  const activity: WaActivity[] = activityData?.activity ?? [];
  const users: WaUser[] = usersData?.users ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bot WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Chatbot ministerial integrado</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['whatsapp-status'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          {status === 'CONNECTED' ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              <Power className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => reconnectMutation.mutate()}
              disabled={reconnectMutation.isPending || status === 'INITIALIZING'}
            >
              <Zap className="w-4 h-4 mr-2" />
              {status === 'INITIALIZING' ? 'Iniciando...' : 'Reconectar'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: QR + Commands */}
        <div className="space-y-6">
          {/* QR Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Conexión WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cargando...
                </div>
              ) : status === 'CONNECTED' ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Wifi className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="font-semibold text-green-700">Bot activo y conectado</p>
                  {statusData?.connectedPhone ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 w-full">
                      <p className="text-xs text-green-600 font-medium mb-1">Número del bot</p>
                      <p className="font-mono font-bold text-green-800 text-lg">
                        +{statusData.connectedPhone}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Los usuarios deben escribir a este número
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      El bot está respondiendo mensajes en WhatsApp.
                    </p>
                  )}
                </div>
              ) : qrUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Escanea este código QR con WhatsApp en tu teléfono
                  </p>
                  <img
                    src={qrUrl}
                    alt="WhatsApp QR Code"
                    className="w-48 h-48 border rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    WhatsApp → Dispositivos vinculados → Vincular dispositivo
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <WifiOff className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {status === 'INITIALIZING'
                      ? 'Iniciando cliente... espera unos segundos'
                      : 'Bot desconectado. Presiona "Reconectar" para iniciar.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commands Reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Comandos disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMMANDS.map((c) => (
                <div key={c.cmd} className="flex items-start gap-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">
                    {c.cmd}
                  </code>
                  <span className="text-xs text-muted-foreground">{c.desc}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Middle + Right: Activity + Users */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Actividad reciente
                <Badge variant="secondary" className="ml-auto">{activity.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-72">
                {activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Sin actividad aún</p>
                    <p className="text-xs">Los mensajes recibidos aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activity.map((entry, i) => (
                      <div key={i} className="p-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-700">
                            {entry.userName ?? entry.phone}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.timestamp), 'HH:mm', { locale: es })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          📱 <span className="font-mono">{entry.message}</span>
                        </p>
                        <p className="text-xs line-clamp-2 text-foreground/70">
                          🤖 {entry.response.replace(/\*/g, '').split('\n')[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Registered Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Usuarios registrados
                <Badge variant="secondary" className="ml-auto">{users.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <p className="text-sm">No hay usuarios con número de WhatsApp registrado</p>
                  <p className="text-xs mt-1">Edita los usuarios y añade su número en el campo WhatsApp</p>
                </div>
              ) : (
                <div className="divide-y">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {u.whatsapp ?? u.phone ?? '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">📋 Instrucciones de configuración</p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Presiona <strong>Reconectar</strong> si el bot está desconectado</li>
                <li>Aparecerá un código QR — escanéalo con WhatsApp</li>
                <li>En WhatsApp: <strong>Ajustes → Dispositivos vinculados → Vincular dispositivo</strong></li>
                <li>El estado cambiará a <strong>Conectado</strong></li>
                <li>Añade los números WhatsApp de los usuarios en <strong>Configuración → Usuarios</strong></li>
                <li>Los usuarios pueden enviar mensajes al número del bot con cualquier comando</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
