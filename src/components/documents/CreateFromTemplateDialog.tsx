import { useState, useEffect } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { useCreateDocumentFromTemplate } from '@/hooks/useDocuments';
import { useEntities } from '@/hooks/useEntities';
import { useUsers } from '@/hooks/useUsers';
import { TemplateType } from '@/lib/api/templates.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (documentId: string) => void;
}

export function CreateFromTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateFromTemplateDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');
  const [entityId, setEntityId] = useState<string>('');
  const [responsibleId, setResponsibleId] = useState<string>('');

  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const { data: entities = [] } = useEntities();
  const { data: users = [] } = useUsers();
  const createMutation = useCreateDocumentFromTemplate();

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId('');
      setVariables({});
      setDirection('INCOMING');
      setEntityId('');
      setResponsibleId('');
    }
  }, [open]);

  // Initialize variables when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const initialVars: Record<string, string> = {};
      selectedTemplate.variables.forEach((varName) => {
        initialVars[varName] = '';
      });
      setVariables(initialVars);
    }
  }, [selectedTemplate]);

  const handleVariableChange = (varName: string, value: string) => {
    setVariables((prev) => ({ ...prev, [varName]: value }));
  };

  const handleSubmit = () => {
    if (!selectedTemplateId) {
      toast.error('Selecciona una plantilla');
      return;
    }

    // Check if all required variables are filled
    const emptyVars = selectedTemplate?.variables.filter((v) => !variables[v]?.trim());
    if (emptyVars && emptyVars.length > 0) {
      toast.error('Completa todas las variables', {
        description: `Faltan: ${emptyVars.join(', ')}`,
      });
      return;
    }

    createMutation.mutate(
      {
        templateId: selectedTemplateId,
        variables,
        direction,
        entityId: entityId || undefined,
        responsibleId: responsibleId || undefined,
      },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          if (onSuccess) {
            onSuccess(data.id);
          }
        },
      }
    );
  };

  const filledCount = selectedTemplate
    ? selectedTemplate.variables.filter((v) => variables[v]?.trim()).length
    : 0;
  const totalCount = selectedTemplate?.variables.length || 0;
  const isComplete = filledCount === totalCount && totalCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Crear documento desde plantilla</DialogTitle>
          <DialogDescription>
            Selecciona una plantilla y completa las variables para generar un documento PDF
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Plantilla</Label>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {template.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedTemplate && (
              <>
                {/* Progress Indicator */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Variables completadas: {filledCount} / {totalCount}
                    </span>
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${(filledCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Direction and Assignment */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOMING">Bandeja de Entrada</SelectItem>
                        <SelectItem value="OUTGOING">Bandeja de Salida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Entidad (opcional)</Label>
                    <Select value={entityId} onValueChange={setEntityId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguna</SelectItem>
                        {entities.map((entity: any) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsable (opcional)</Label>
                    <Select value={responsibleId} onValueChange={setResponsibleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Variable Inputs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Completar variables</h4>
                    <Badge variant="secondary" className="text-xs">
                      {selectedTemplate.variables.length} campos
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    {selectedTemplate.variables.map((varName) => {
                      const isLongText = ['contenido', 'content', 'texto'].includes(varName.toLowerCase());

                      return (
                        <div key={varName} className="space-y-2">
                          <Label htmlFor={varName} className="flex items-center gap-2">
                            {varName}
                            {variables[varName]?.trim() && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </Label>
                          {isLongText ? (
                            <Textarea
                              id={varName}
                              value={variables[varName] || ''}
                              onChange={(e) => handleVariableChange(varName, e.target.value)}
                              placeholder={`Ingrese ${varName}...`}
                              className="min-h-[120px] font-mono text-sm"
                            />
                          ) : (
                            <Input
                              id={varName}
                              value={variables[varName] || ''}
                              onChange={(e) => handleVariableChange(varName, e.target.value)}
                              placeholder={`Ingrese ${varName}...`}
                              className="font-mono"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTemplateId || !isComplete || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
