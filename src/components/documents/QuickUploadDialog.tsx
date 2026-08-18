import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Upload, FileText, Check, ChevronsUpDown, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { entitiesApi } from '@/lib/api/entities.api';
import { documentsApi } from '@/lib/api/documents.api';
import { useAuth } from '@/contexts/AuthContext';

interface QuickUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickUploadDialog({ open, onOpenChange }: QuickUploadDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [entityOpen, setEntityOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: entitiesApi.getAll,
  });

  const filteredEntities = entitySearch.length >= 3
    ? (entities as any[]).filter((e) =>
        e.name.toLowerCase().includes(entitySearch.toLowerCase())
      )
    : [];

  const selectedEntity = (entities as any[]).find((e) => e.id === entityId);

  const handleFile = (f: File) => {
    setFile(f);
    if (!title) {
      // Auto-fill title from filename (strip extension, humanise separators)
      setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleReset = () => {
    setTitle('');
    setEntityId('');
    setEntitySearch('');
    setEntityOpen(false);
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (uploading) return;
    handleReset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('El título es requerido'); return; }
    if (!entityId) { toast.error('Seleccione una entidad/departamento'); return; }
    if (!file) { toast.error('Seleccione un archivo para subir'); return; }

    try {
      setUploading(true);
      toast.loading('Creando documento...');

      const doc = await documentsApi.create({
        title: title.trim(),
        type: 'Oficio',
        direction: 'IN',
        classification: 'EXTERNAL',
        entityId,
        responsibleId: user!.id,
        priority: 'MEDIUM',
      });

      toast.dismiss();
      toast.loading('Subiendo archivo...');

      await documentsApi.uploadFiles(doc.id, [file], (progress) => {
        setUploadProgress(progress);
        toast.dismiss();
        toast.loading(`Subiendo archivo... ${progress}%`);
      });

      toast.dismiss();
      toast.success('Documento subido correctamente');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      handleReset();
      onOpenChange(false);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[480px] flex flex-col max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Subir Documento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4 py-2">
          {/* Drop Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary/50',
              file && 'border-green-500 bg-green-50/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-green-600 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-green-700 truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-auto p-1 hover:bg-muted rounded shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arrastre un archivo aquí o haga clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  PDF, Word, Excel, Imágenes (máx. 50 MB)
                </p>
              </>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-title">
              Título / Asunto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quick-title"
              placeholder="Se rellena automáticamente desde el nombre del archivo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Entity Combobox */}
          <div className="space-y-1.5">
            <Label>
              Departamento / Entidad <span className="text-red-500">*</span>
            </Label>
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
                    {selectedEntity ? selectedEntity.name : 'Escriba al menos 3 letras para buscar...'}
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
                      filteredEntities.map((entity) => (
                        <CommandItem
                          key={entity.id}
                          value={entity.id}
                          onSelect={() => {
                            setEntityId(entity.id);
                            setEntitySearch('');
                            setEntityOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              entityId === entity.id ? 'opacity-100' : 'opacity-0'
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
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0 px-6 pb-6 pt-2 shrink-0 border-t">
          <Button variant="outline" onClick={handleClose} disabled={uploading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !file || !title.trim() || !entityId}
            className="w-full sm:w-auto"
          >
            {uploading ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
