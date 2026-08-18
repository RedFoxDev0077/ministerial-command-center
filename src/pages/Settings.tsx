import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { locales, Locale } from '@/lib/i18n';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  usePreferences,
  useUpdatePreferences
} from '@/hooks/usePreferences';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
} from '@/hooks/useTemplates';
import { TemplateType, DocumentTemplate } from '@/lib/api/templates.api';
import {
  Users,
  FileText,
  Globe,
  Bell,
  Shield,
  Eye,
  Edit,
  PenTool,
  Plus,
  Trash2,
  Copy,
  MoreVertical,
  Mail,
  FileInput,
  FileOutput,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const roles = [
  { id: 'admin', name: 'Administrador', permissions: ['read', 'write', 'sign', 'admin'] },
  { id: 'gabinete', name: 'Gabinete', permissions: ['read', 'write', 'sign'] },
  { id: 'revisor', name: 'Revisor', permissions: ['read', 'write'] },
  { id: 'lector', name: 'Lector', permissions: ['read'] },
];

interface Template {
  id: string;
  name: string;
  type: 'oficio' | 'memorando' | 'circular' | 'respuesta';
  content: string;
  variables: string[];
  isDefault: boolean;
}

const initialTemplates: Template[] = [
  {
    id: 't1',
    name: 'Oficio formal estándar',
    type: 'oficio',
    content: 'OFICIO N° {{numero}}\n\n{{ciudad}}, {{fecha}}\n\nSeñor(a):\n{{destinatario}}\n{{cargo_destinatario}}\nPresente.-\n\nREF: {{asunto}}\n\nTengo el agrado de dirigirme a usted para {{contenido}}\n\nSin otro particular, hago propicia la ocasión para expresarle los sentimientos de mi consideración y estima.\n\nAtentamente,\n\n\n{{firmante}}\n{{cargo_firmante}}',
    variables: ['numero', 'ciudad', 'fecha', 'destinatario', 'cargo_destinatario', 'asunto', 'contenido', 'firmante', 'cargo_firmante'],
    isDefault: true,
  },
  {
    id: 't2',
    name: 'Memorando interno',
    type: 'memorando',
    content: 'MEMORANDO N° {{numero}}\n\nA: {{destinatario}}\nDE: {{remitente}}\nASUNTO: {{asunto}}\nFECHA: {{fecha}}\n\n{{contenido}}\n\nAtentamente,\n\n{{firmante}}',
    variables: ['numero', 'destinatario', 'remitente', 'asunto', 'fecha', 'contenido', 'firmante'],
    isDefault: true,
  },
  {
    id: 't3',
    name: 'Circular informativa',
    type: 'circular',
    content: 'CIRCULAR N° {{numero}}\n\nFecha: {{fecha}}\n\nPara: {{destinatarios}}\nDe: {{remitente}}\nAsunto: {{asunto}}\n\nPor medio de la presente se comunica a todos los interesados que:\n\n{{contenido}}\n\nSe agradece su atención y colaboración.\n\n{{firmante}}\n{{cargo_firmante}}',
    variables: ['numero', 'fecha', 'destinatarios', 'remitente', 'asunto', 'contenido', 'firmante', 'cargo_firmante'],
    isDefault: false,
  },
  {
    id: 't4',
    name: 'Respuesta a solicitud',
    type: 'respuesta',
    content: 'OFICIO N° {{numero}}\n\nREF: Su comunicación de fecha {{fecha_solicitud}}\n\n{{ciudad}}, {{fecha}}\n\nSeñor(a):\n{{destinatario}}\nPresente.-\n\nEn respuesta a su comunicación de la referencia, me permito informarle que:\n\n{{contenido}}\n\nSin otro particular, me suscribo de usted.\n\nAtentamente,\n\n{{firmante}}\n{{cargo_firmante}}',
    variables: ['numero', 'fecha_solicitud', 'ciudad', 'fecha', 'destinatario', 'contenido', 'firmante', 'cargo_firmante'],
    isDefault: false,
  },
];

const templateTypes: Record<TemplateType, { label: string; icon: any; color: string }> = {
  [TemplateType.OFICIO]: { label: 'Oficio', icon: FileOutput, color: 'text-blue-600' },
  [TemplateType.MEMORANDO]: { label: 'Memorando', icon: FileInput, color: 'text-purple-600' },
  [TemplateType.CIRCULAR]: { label: 'Circular', icon: Mail, color: 'text-green-600' },
  [TemplateType.RESPUESTA]: { label: 'Respuesta', icon: FileText, color: 'text-orange-600' },
  [TemplateType.DECRETO]: { label: 'Decreto', icon: Shield, color: 'text-red-600' },
  [TemplateType.RESOLUCION]: { label: 'Resolución', icon: PenTool, color: 'text-indigo-600' },
};

export default function SettingsPage() {
  const { t, locale, setLocale } = useLanguage();
  const { toast } = useToast();

  // API Hooks - Real backend data
  const { data: preferences, isLoading: prefsLoading } = usePreferences();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const updatePreferencesMutation = useUpdatePreferences();
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();
  const duplicateTemplateMutation = useDuplicateTemplate();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TemplateType>(TemplateType.OFICIO);
  const [editContent, setEditContent] = useState('');
  const [customVariable, setCustomVariable] = useState('');

  // Textarea ref for cursor position
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCreateTemplate = () => {
    setEditName('');
    setEditType(TemplateType.OFICIO);
    setEditContent('');
    setCustomVariable('');
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditType(template.type);
    setEditContent(template.content);
    setCustomVariable('');
    setIsCreating(false);
    setIsEditing(true);
  };

  // Insert variable at cursor position
  const handleInsertVariable = (variableName: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variable = `{{${variableName}}}`;

    const newContent = editContent.substring(0, start) + variable + editContent.substring(end);
    setEditContent(newContent);

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);

    toast({
      title: 'Variable insertada',
      description: `{{${variableName}}} agregado al contenido`,
    });
  };

  // Insert custom variable
  const handleInsertCustomVariable = () => {
    if (!customVariable.trim()) {
      toast({
        title: 'Variable vacía',
        description: 'Por favor ingresa un nombre para la variable',
        variant: 'destructive',
      });
      return;
    }

    // Validate variable name (only letters, numbers, underscores)
    const validName = /^[a-zA-Z0-9_]+$/.test(customVariable);
    if (!validName) {
      toast({
        title: 'Nombre inválido',
        description: 'Solo usa letras, números y guiones bajos (_)',
        variant: 'destructive',
      });
      return;
    }

    handleInsertVariable(customVariable);
    setCustomVariable('');
  };

  const handleDuplicateTemplate = (templateId: string) => {
    duplicateTemplateMutation.mutate(templateId);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplateMutation.mutate(id);
  };

  const handleSaveTemplate = () => {
    if (!editName.trim() || !editContent.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor complete el nombre y contenido de la plantilla',
        variant: 'destructive',
      });
      return;
    }

    if (isCreating) {
      createTemplateMutation.mutate({
        name: editName,
        type: editType,
        content: editContent,
      });
    } else if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        dto: {
          name: editName,
          type: editType,
          content: editContent,
        },
      });
    }

    setIsEditing(false);
    setEditingTemplate(null);
  };

  // Handle preference updates
  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles"><Users className="h-4 w-4 mr-2" />{t('settings.roles')}</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />{t('settings.templates')}</TabsTrigger>
          <TabsTrigger value="language"><Globe className="h-4 w-4 mr-2" />{t('settings.language')}</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="h-4 w-4 mr-2" />{t('settings.alerts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matriz de permisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Rol</th>
                      <th className="px-4 py-2"><Eye className="h-4 w-4 mx-auto" /></th>
                      <th className="px-4 py-2"><Edit className="h-4 w-4 mx-auto" /></th>
                      <th className="px-4 py-2"><PenTool className="h-4 w-4 mx-auto" /></th>
                      <th className="px-4 py-2"><Shield className="h-4 w-4 mx-auto" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(role => (
                      <tr key={role.id} className="border-b">
                        <td className="py-3 pr-4 font-medium">{role.name}</td>
                        {['read', 'write', 'sign', 'admin'].map(perm => (
                          <td key={perm} className="px-4 py-3 text-center">
                            {role.permissions.includes(perm)
                              ? <Badge variant="default" className="h-6 w-6 p-0 justify-center">✓</Badge>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Plantillas de documentos</CardTitle>
              <Button onClick={handleCreateTemplate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva plantilla
              </Button>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => {
                    const TypeIcon = templateTypes[template.type].icon;
                    return (
                      <div
                      key={template.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${templateTypes[template.type].color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">Por defecto</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {templateTypes[template.type].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {template.variables.length} variables
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {!template.isDefault && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Variables disponibles</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Usa {'{{nombre_variable}}'} en el contenido para crear campos dinámicos
                </p>
                <div className="flex flex-wrap gap-2">
                  {['numero', 'fecha', 'ciudad', 'destinatario', 'remitente', 'asunto', 'contenido', 'firmante', 'cargo_firmante'].map(v => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Editor Dialog */}
          <Dialog open={isEditing} onOpenChange={(open) => {
            if (!open) {
              setIsEditing(false);
              setEditingTemplate(null);
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {isCreating ? 'Nueva plantilla' : 'Editar plantilla'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nombre de la plantilla</Label>
                    <Input
                      id="template-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ej: Oficio de respuesta formal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-type">Tipo de documento</Label>
                    <Select value={editType} onValueChange={(v) => setEditType(v as TemplateType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(templateTypes).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-content">Contenido de la plantilla</Label>
                  <Textarea
                    ref={contentTextareaRef}
                    id="template-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Escribe el contenido de la plantilla usando variables..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Haz clic en las variables de abajo para insertarlas en el contenido
                  </p>
                </div>

                {/* Variable Picker - Clickable Badges */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Variables disponibles</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Haz clic para insertar en el cursor</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {[...new Set((editContent.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')))].length} usadas
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {['numero', 'fecha', 'ciudad', 'destinatario', 'cargo_destinatario', 'remitente', 'asunto', 'contenido', 'firmante', 'cargo_firmante'].map(v => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="text-xs font-mono cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:scale-105 active:scale-95"
                        onClick={() => handleInsertVariable(v)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>

                  {/* Custom Variable Input */}
                  <div className="border-t border-blue-200 dark:border-blue-800 pt-3 mt-3">
                    <Label className="text-xs text-blue-900 dark:text-blue-100 mb-2 block">
                      Variable personalizada
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={customVariable}
                        onChange={(e) => setCustomVariable(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInsertCustomVariable();
                          }
                        }}
                        placeholder="nombre_variable"
                        className="flex-1 h-8 text-xs font-mono"
                      />
                      <Button
                        onClick={handleInsertCustomVariable}
                        size="sm"
                        variant="secondary"
                        className="h-8 px-3"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Insertar
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5">
                      Solo letras, números y guiones bajos (_)
                    </p>
                  </div>
                </div>

                {/* Detected Variables */}
                {editContent && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs font-medium mb-2">✓ Variables detectadas en el contenido:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set((editContent.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')))].map(v => (
                        <Badge key={v} variant="secondary" className="text-xs font-mono bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                          {v}
                        </Badge>
                      ))}
                      {!(editContent.match(/\{\{(\w+)\}\}/g) || []).length && (
                        <span className="text-xs text-muted-foreground">Ninguna variable detectada aún</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditingTemplate(null);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {isCreating ? 'Crear plantilla' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Idioma de la interfaz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prefsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select
                      value={preferences?.language || locale}
                      onValueChange={(v) => {
                        setLocale(v as Locale);
                        handlePreferenceChange('language', v);
                      }}
                      disabled={updatePreferencesMutation.isPending}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(locales).map(([code, name]) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.timezone')}</Label>
                    <Select
                      value={preferences?.timezone || 'Africa/Malabo'}
                      onValueChange={(v) => handlePreferenceChange('timezone', v)}
                      disabled={updatePreferencesMutation.isPending}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Malabo">África/Malabo (Guinea Ecuatorial)</SelectItem>
                        <SelectItem value="Europe/Madrid">Europa/Madrid (UTC+1)</SelectItem>
                        <SelectItem value="America/Lima">América/Lima (UTC-5)</SelectItem>
                        <SelectItem value="America/Mexico_City">América/Ciudad de México (UTC-6)</SelectItem>
                        <SelectItem value="America/Buenos_Aires">América/Buenos Aires (UTC-3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings.alerts')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prefsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recordar 48h antes del vencimiento</Label>
                      <p className="text-sm text-muted-foreground">Enviar recordatorio automático</p>
                    </div>
                    <Switch
                      checked={preferences?.reminder48hBefore ?? true}
                      onCheckedChange={(checked) => handlePreferenceChange('reminder48hBefore', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Escalar plazos vencidos</Label>
                      <p className="text-sm text-muted-foreground">Notificar al supervisor</p>
                    </div>
                    <Switch
                      checked={preferences?.escalateOverdue ?? true}
                      onCheckedChange={(checked) => handlePreferenceChange('escalateOverdue', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificaciones por correo</Label>
                      <p className="text-sm text-muted-foreground">Recibir alertas por email</p>
                    </div>
                    <Switch
                      checked={preferences?.emailNotifications ?? true}
                      onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Resumen diario</Label>
                      <p className="text-sm text-muted-foreground">Recibir resumen de actividad cada mañana</p>
                    </div>
                    <Switch
                      checked={preferences?.dailySummary ?? false}
                      onCheckedChange={(checked) => handlePreferenceChange('dailySummary', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
