import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FileUpload, type UploadedFile } from '@/components/documents/FileUpload';
import { documentsApi, type CreateDocumentDto } from '@/lib/api/documents.api';
import { useCreateDocument } from '@/hooks/useDocuments';
import { entitiesApi } from '@/lib/api/entities.api';
import { usersApi } from '@/lib/api/users.api';
import { Loader2, FileText, Upload, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const documentTypes = [
  'Oficio',
  'Memorando',
  'Circular',
  'Resolución',
  'Decreto',
  'Informe',
  'Solicitud',
  'Carta',
  'Acuerdo',
  'Otro'
];

export default function NewEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createDocument = useCreateDocument();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'creating' | 'uploading'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [entityOpen, setEntityOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    direction: 'IN' as 'IN' | 'OUT',
    classification: 'EXTERNAL' as 'INTERNAL' | 'EXTERNAL',
    sender: '',
    channel: '',
    entityId: '',
    responsibleId: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    content: '',
    receivedAt: new Date().toISOString().split('T')[0],
    // Official PDF header fields
    subDepartment: '',
    referenceCode: '',
    signerTitle: '',
    recipientTitle: '',
  });

  // Fetch entities (departments)
  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: entitiesApi.getAll,
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Por favor ingrese el título del documento');
      return;
    }
    if (!formData.type) {
      toast.error('Por favor seleccione el tipo de documento');
      return;
    }
    if (!formData.entityId) {
      toast.error('Por favor seleccione un departamento');
      return;
    }
    if (!formData.responsibleId) {
      toast.error('Por favor asigne un responsable');
      return;
    }

    try {
      setLoading(true);
      setUploadStatus('creating');
      toast.loading('Creando documento...');

      // Create document
      const createDto: CreateDocumentDto = {
        title: formData.title,
        type: formData.type,
        direction: formData.direction,
        classification: formData.classification,
        origin: formData.sender || undefined,
        channel: formData.channel || undefined,
        entityId: formData.entityId,
        responsibleId: formData.responsibleId,
        priority: formData.priority,
        content: formData.content || undefined,
        receivedAt: formData.receivedAt ? new Date(formData.receivedAt) : undefined,
        // Official PDF fields
        subDepartment: formData.subDepartment || undefined,
        referenceCode: formData.referenceCode || undefined,
        signerTitle: formData.signerTitle || undefined,
        recipientTitle: formData.recipientTitle || undefined,
      };

      const document = await createDocument.mutateAsync(createDto);

      // Upload files if any (separate step with its own error handling)
      const filesToUpload = uploadedFiles
        .filter((f) => f.file)
        .map((f) => f.file!);

      if (filesToUpload.length > 0) {
        toast.dismiss();
        setUploadStatus('uploading');
        setUploadProgress(0);
        toast.loading(`Subiendo ${filesToUpload.length} archivo(s)... 0%`);

        try {
          await documentsApi.uploadFiles(document.id, filesToUpload, (progress) => {
            setUploadProgress(progress);
            toast.dismiss();
            toast.loading(`Subiendo archivos... ${progress}%`);
          });
          toast.dismiss();
          toast.success('Documento y archivos creados correctamente');
        } catch (uploadError: any) {
          // Document was created successfully but file upload failed
          toast.dismiss();
          const errMsg = uploadError.response?.data?.message || uploadError.message || 'Error de conexión';
          toast.error(
            `Documento guardado, pero falló la subida de archivos: ${errMsg}. Puede adjuntarlos desde el detalle del documento.`,
            { duration: 8000 }
          );
          // Still navigate — the document itself was created
        }
      } else {
        toast.dismiss();
        toast.success('Documento creado correctamente');
      }

      // Wait for all document queries to refetch before navigating
      await queryClient.refetchQueries({ queryKey: ['documents'] });

      // Navigate to inbox
      navigate('/inbox');
    } catch (error: any) {
      // Only reaches here if document CREATION itself failed
      console.error('Error creating document:', error);
      toast.dismiss();
      toast.error('Error al crear documento: ' + (error.response?.data?.message || error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <PageHeader
        title="Nuevo Documento"
        description="Complete el formulario para crear un nuevo documento"
        icon={FileText}
      />

      <form onSubmit={handleSubmit} className="mt-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Asunto / Título del Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: Solicitud de información presupuestaria"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Type and Direction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  Tipo de Documento <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">
                  Dirección <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value: 'IN' | 'OUT') => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger id="direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Bandeja de Entrada</SelectItem>
                    <SelectItem value="OUT">Bandeja de Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sender and Channel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender">Remitente / Procedencia</Label>
                <Input
                  id="sender"
                  placeholder="Ej: Ministerio de Educación"
                  value={formData.sender}
                  onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Canal de Recepción</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value })}
                >
                  <SelectTrigger id="channel">
                    <SelectValue placeholder="Seleccione canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Correo electrónico">Correo electrónico</SelectItem>
                    <SelectItem value="Plataforma digital">Plataforma digital</SelectItem>
                    <SelectItem value="Mensajería física">Mensajería física</SelectItem>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Fax">Fax</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Department and Responsible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Departamento / Entidad <span className="text-red-500">*</span>
                </Label>
                {(() => {
                  const selectedEntity = (entities as any[]).find((e) => e.id === formData.entityId);
                  const filteredEntities = entitySearch.length >= 3
                    ? (entities as any[]).filter((e) =>
                        e.name.toLowerCase().includes(entitySearch.toLowerCase())
                      )
                    : [];
                  return (
                    <Popover open={entityOpen} onOpenChange={setEntityOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between font-normal',
                            !selectedEntity && 'text-muted-foreground'
                          )}
                        >
                          <span className="truncate">
                            {selectedEntity
                              ? selectedEntity.name
                              : 'Escriba al menos 3 letras para buscar...'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[9999]">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar entidad (mín. 3 letras)..."
                            value={entitySearch}
                            onValueChange={setEntitySearch}
                          />
                          <CommandList>
                            {entitySearch.length < 3 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Escriba al menos 3 letras para buscar
                              </div>
                            ) : filteredEntities.length === 0 ? (
                              <CommandEmpty />
                            ) : (
                              filteredEntities.map((entity: any) => (
                                <CommandItem
                                  key={entity.id}
                                  value={entity.id}
                                  onSelect={() => {
                                    setFormData({ ...formData, entityId: entity.id });
                                    setEntitySearch('');
                                    setEntityOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      formData.entityId === entity.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {entity.name}
                                </CommandItem>
                              ))
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible">
                  Responsable <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.responsibleId}
                  onValueChange={(value) => setFormData({ ...formData, responsibleId: value })}
                >
                  <SelectTrigger id="responsible">
                    <SelectValue placeholder="Seleccione responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority and Received Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedAt">Fecha de Recepción</Label>
                <Input
                  id="receivedAt"
                  type="date"
                  value={formData.receivedAt}
                  onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Contenido / Descripción</Label>
              <Textarea
                id="content"
                placeholder="Descripción del documento..."
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            {/* Official PDF Header Fields */}
            <div className="p-4 border rounded-lg bg-blue-50/50 space-y-4">
              <div className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Datos para el PDF Oficial (membrete del documento)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subDepartment">Dirección General / Sub-Departamento</Label>
                  <input
                    id="subDepartment"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ej: Dirección General de Puertos y Marina Mercante"
                    value={formData.subDepartment}
                    onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceCode">Recc- / Código de Referencia</Label>
                  <input
                    id="referenceCode"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ej: Puerto Privados"
                    value={formData.referenceCode}
                    onChange={(e) => setFormData({ ...formData, referenceCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signerTitle">Título del Firmante</Label>
                  <Select
                    value={formData.signerTitle}
                    onValueChange={(value) => setFormData({ ...formData, signerTitle: value })}
                  >
                    <SelectTrigger id="signerTitle">
                      <SelectValue placeholder="Seleccione título del firmante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="El Ministro">El Ministro</SelectItem>
                      <SelectItem value="La Ministra">La Ministra</SelectItem>
                      <SelectItem value="El Director General">El Director General</SelectItem>
                      <SelectItem value="La Directora General">La Directora General</SelectItem>
                      <SelectItem value="El Secretario General">El Secretario General</SelectItem>
                      <SelectItem value="La Secretaria General">La Secretaria General</SelectItem>
                      <SelectItem value="El Director de Departamento">El Director de Departamento</SelectItem>
                      <SelectItem value="La Directora de Departamento">La Directora de Departamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientTitle">Destinatario (línea final del documento)</Label>
                  <input
                    id="recipientTitle"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ej: Excmo. Señor Ministro de Transportes, Correos y Sistemas de Inteligencia Artificial"
                    value={formData.recipientTitle}
                    onChange={(e) => setFormData({ ...formData, recipientTitle: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Archivos Adjuntos</Label>
              <FileUpload
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                maxFiles={10}
                maxSize={50}
              />
            </div>

            {/* Upload Progress Bar */}
            {uploadStatus === 'uploading' && (
              <div className="space-y-1 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 animate-pulse" />
                  <span>Subiendo archivos... {uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadStatus === 'creating' ? 'Creando documento...' :
                 uploadStatus === 'uploading' ? `Subiendo archivos ${uploadProgress}%...` :
                 'Crear Documento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
