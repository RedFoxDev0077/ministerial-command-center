import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PenTool } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axios';
import { createSignatureFlow } from '@/lib/api/signature-flows.api';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function SignatureDialog({ open, onOpenChange, document }: SignatureDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationMethod, setNotificationMethod] = useState<'EMAIL' | 'WHATSAPP' | 'BOTH'>('EMAIL');
  const queryClient = useQueryClient();

  // Fetch users (filter for signatories)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axiosInstance.get('/users');
      return response.data;
    },
    enabled: open,
  });

  // Send to signature mutation
  const signatureMutation = useMutation({
    mutationFn: async (data: any) => {
      return createSignatureFlow({
        documentId: document.id,
        userIds: data.userIds,
        message: data.message,
        sendNotification: data.sendNotification,
        notificationMethod: data.notificationMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['signature-flows'] });
      toast.success('Documento enviado a firma exitosamente');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al enviar documento a firma');
    },
  });

  const handleClose = () => {
    setSelectedUserIds([]);
    setMessage('');
    setSendNotification(true);
    setNotificationMethod('EMAIL');
    onOpenChange(false);
  };

  const handleSend = () => {
    if (selectedUserIds.length === 0) {
      toast.error('Por favor seleccione al menos un firmante');
      return;
    }

    signatureMutation.mutate({
      userIds: selectedUserIds,
      message: message.trim() || undefined,
      sendNotification,
      notificationMethod: sendNotification ? notificationMethod : undefined,
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            Enviar a Firma
          </DialogTitle>
          <DialogDescription>
            Enviar este documento para firma electrónica
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{document?.title}</p>
            <p className="text-xs text-muted-foreground">{document?.correlativeNumber}</p>
          </div>

          {/* Signatories Selection */}
          <div className="space-y-2">
            <Label>Firmantes * (Seleccione uno o más)</Label>
            <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay usuarios disponibles</p>
              ) : (
                users.map((user: User) => (
                  <div key={user.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={user.id}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <label
                      htmlFor={user.id}
                      className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <div className="flex flex-col">
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </label>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </div>
                ))
              )}
            </div>
            {selectedUserIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedUserIds.length} firmante(s) seleccionado(s)
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Instrucciones o comentarios para los firmantes..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendNotification"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(checked as boolean)}
              />
              <label
                htmlFor="sendNotification"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enviar notificación a los firmantes
              </label>
            </div>

            {sendNotification && (
              <div className="pl-6 space-y-2">
                <Label htmlFor="notificationMethod">Método de Notificación</Label>
                <Select value={notificationMethod} onValueChange={(value: any) => setNotificationMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">📧 Email</SelectItem>
                    <SelectItem value="WHATSAPP">💬 WhatsApp</SelectItem>
                    <SelectItem value="BOTH">📧💬 Email y WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={signatureMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={signatureMutation.isPending || selectedUserIds.length === 0}>
            {signatureMutation.isPending ? 'Enviando...' : 'Enviar a Firma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
