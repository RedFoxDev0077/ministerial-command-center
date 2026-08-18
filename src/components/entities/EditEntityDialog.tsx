import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  entitiesApi,
  Entity,
  UpdateEntityDto,
  EntityType,
  Classification,
  getEntityTypeLabel,
  getClassificationLabel,
} from '@/lib/api/entities.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface EditEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity;
}

export function EditEntityDialog({ open, onOpenChange, entity }: EditEntityDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateEntityDto>({
    name: entity.name,
    shortName: entity.shortName || '',
    type: entity.type,
    classification: entity.classification,
    address: entity.address || '',
    phone: entity.phone || '',
    email: entity.email || '',
    website: entity.website || '',
    description: entity.description || '',
  });

  // Update form when entity changes
  useEffect(() => {
    setFormData({
      name: entity.name,
      shortName: entity.shortName || '',
      type: entity.type,
      classification: entity.classification,
      address: entity.address || '',
      phone: entity.phone || '',
      email: entity.email || '',
      website: entity.website || '',
      description: entity.description || '',
    });
  }, [entity]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEntityDto) => entitiesApi.update(entity.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success('Entidad actualizada exitosamente');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar entidad');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.type || !formData.classification) {
      toast.error('Por favor complete todos los campos obligatorios');
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      toast.error('Por favor ingrese un email válido');
      return;
    }

    if (formData.website && formData.website.length > 0 && !formData.website.startsWith('http')) {
      toast.error('Por favor ingrese una URL válida (debe comenzar con http:// o https://)');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateMutation.isPending) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
        if (updateMutation.isPending) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>Editar Entidad</DialogTitle>
          <DialogDescription>
            Actualice los datos de la entidad
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ministerio de Salud"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Short Name */}
            <div className="space-y-2">
              <Label htmlFor="shortName">Siglas / Nombre Corto</Label>
              <Input
                id="shortName"
                placeholder="MINSALUD"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as EntityType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value={EntityType.GOVERNMENT_MINISTRY}>
                    {getEntityTypeLabel(EntityType.GOVERNMENT_MINISTRY)}
                  </SelectItem>
                  <SelectItem value={EntityType.PUBLIC_COMPANY}>
                    {getEntityTypeLabel(EntityType.PUBLIC_COMPANY)}
                  </SelectItem>
                  <SelectItem value={EntityType.PRIVATE_COMPANY}>
                    {getEntityTypeLabel(EntityType.PRIVATE_COMPANY)}
                  </SelectItem>
                  <SelectItem value={EntityType.INTERNAL_DEPARTMENT}>
                    {getEntityTypeLabel(EntityType.INTERNAL_DEPARTMENT)}
                  </SelectItem>
                  <SelectItem value={EntityType.INTERNATIONAL_ORG}>
                    {getEntityTypeLabel(EntityType.INTERNATIONAL_ORG)}
                  </SelectItem>
                  <SelectItem value={EntityType.CITIZEN}>
                    {getEntityTypeLabel(EntityType.CITIZEN)}
                  </SelectItem>
                  <SelectItem value={EntityType.OTHER}>
                    {getEntityTypeLabel(EntityType.OTHER)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Classification */}
            <div className="space-y-2">
              <Label htmlFor="classification">Clasificación *</Label>
              <Select
                value={formData.classification}
                onValueChange={(value) => setFormData({ ...formData, classification: value as Classification })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value={Classification.INTERNAL}>
                    {getClassificationLabel(Classification.INTERNAL)}
                  </SelectItem>
                  <SelectItem value={Classification.EXTERNAL}>
                    {getClassificationLabel(Classification.EXTERNAL)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="info@ministerio.gq"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+240222123456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.ministerio.gq"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            {/* Address */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Calle Principal, Malabo"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción breve de la entidad..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
