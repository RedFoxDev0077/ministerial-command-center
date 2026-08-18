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
import { UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axios';

interface AssignDialogProps {
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
  departmentId?: string;
}

export function AssignDialog({ open, onOpenChange, document }: AssignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axiosInstance.get('/users');
      return response.data;
    },
    enabled: open,
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note?: string }) => {
      const response = await axiosInstance.post(`/documents/${document.id}/assign`, {
        userId,
        note,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento asignado exitosamente');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar documento');
    },
  });

  const handleClose = () => {
    setSelectedUserId('');
    setNote('');
    onOpenChange(false);
  };

  const handleAssign = () => {
    if (!selectedUserId) {
      toast.error('Por favor seleccione un usuario');
      return;
    }

    assignMutation.mutate({ userId: selectedUserId, note: note || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Asignar Responsable
          </DialogTitle>
          <DialogDescription>
            Asignar este documento a un usuario responsable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{document?.title}</p>
            <p className="text-xs text-muted-foreground">{document?.correlativeNumber}</p>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user">Usuario Responsable *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Cargando usuarios..." : "Seleccionar usuario"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {users.map((user: User) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Textarea
              id="note"
              placeholder="Agregar nota o instrucciones para el responsable..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assignMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={assignMutation.isPending || !selectedUserId}>
            {assignMutation.isPending ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
