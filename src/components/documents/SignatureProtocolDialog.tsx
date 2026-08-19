import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents.api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { PenTool, Shield, Stamp as StampIcon, AlertCircle } from 'lucide-react';

interface SignatureProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
  mode: 'signature' | 'seal' | 'complete';
}

export function SignatureProtocolDialog({
  open,
  onOpenChange,
  document,
  mode = 'signature'
}: SignatureProtocolDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(mode);

  // Signature form state
  const [digitalSignature, setDigitalSignature] = useState<File | null>(null);
  const [physicalSignatureScan, setPhysicalSignatureScan] = useState<File | null>(null);
  const [signatureData, setSignatureData] = useState({
    signatureType: 'BOTH' as 'DIGITAL' | 'PHYSICAL' | 'BOTH',
    notes: '',
  });

  // Seal form state
  const [sealScan, setSealScan] = useState<File | null>(null);
  const [sealData, setSealData] = useState({
    appliedBy: '',
    notes: '',
  });

  // Check if document is ready for signature
  const { data: readyForSignature } = useQuery({
    queryKey: ['signature-ready', document.id],
    queryFn: () => documentsApi.isReadyForSignature(document.id),
    enabled: open && mode === 'signature',
  });

  // Get current signature info
  const { data: signatureInfo } = useQuery({
    queryKey: ['signature-info', document.id],
    queryFn: () => documentsApi.getSignatureInfo(document.id),
    enabled: open,
  });

  // Sign document mutation
  const signDocumentMutation = useMutation({
    mutationFn: async () => {
      return documentsApi.signDocument(document.id, {
        signatureType: signatureData.signatureType,
        signatureDate: new Date(),
        digitalSignature: digitalSignature || undefined,
        physicalSignatureScan: physicalSignatureScan || undefined,
        notes: signatureData.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Documento firmado exitosamente por el Ministro');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['signature-info', document.id] });
      resetSignatureForm();
      setActiveTab('seal'); // Move to seal tab after signing
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al firmar el documento');
    },
  });

  // Apply seal mutation
  const applySealMutation = useMutation({
    mutationFn: async () => {
      return documentsApi.applySeal(document.id, {
        sealDate: new Date(),
        sealScan: sealScan || undefined,
        appliedBy: sealData.appliedBy,
        notes: sealData.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Sello oficial aplicado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['signature-info', document.id] });
      resetSealForm();
      setActiveTab('complete'); // Move to complete tab after seal
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al aplicar el sello');
    },
  });

  // Complete signature protocol mutation
  const completeProtocolMutation = useMutation({
    mutationFn: async () => {
      return documentsApi.completeSignatureProtocol(document.id);
    },
    onSuccess: () => {
      toast.success('Protocolo de firma completado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      onOpenChange(false);
      resetAllForms();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al completar el protocolo');
    },
  });

  const resetSignatureForm = () => {
    setDigitalSignature(null);
    setPhysicalSignatureScan(null);
    setSignatureData({
      signatureType: 'BOTH',
      notes: '',
    });
  };

  const resetSealForm = () => {
    setSealScan(null);
    setSealData({
      appliedBy: '',
      notes: '',
    });
  };

  const resetAllForms = () => {
    resetSignatureForm();
    resetSealForm();
    setActiveTab('signature');
  };

  const handleDigitalSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor seleccione un archivo de imagen válido');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 5MB');
        return;
      }
      setDigitalSignature(file);
    }
  };

  const handlePhysicalSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor seleccione un archivo de imagen válido');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 5MB');
        return;
      }
      setPhysicalSignatureScan(file);
    }
  };

  const handleSealScanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor seleccione un archivo de imagen válido');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 5MB');
        return;
      }
      setSealScan(file);
    }
  };

  const handleSignatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (signatureData.signatureType === 'DIGITAL' && !digitalSignature) {
      toast.error('Por favor adjunte la firma digital');
      return;
    }

    if (signatureData.signatureType === 'PHYSICAL' && !physicalSignatureScan) {
      toast.error('Por favor adjunte el escaneo de la firma física');
      return;
    }

    if (signatureData.signatureType === 'BOTH' && !digitalSignature && !physicalSignatureScan) {
      toast.error('Por favor adjunte al menos una firma');
      return;
    }

    signDocumentMutation.mutate();
  };

  const handleSealSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sealData.appliedBy || sealData.appliedBy.trim() === '') {
      toast.error('Por favor ingrese quién aplicó el sello');
      return;
    }

    applySealMutation.mutate();
  };

  const handleCompleteProtocol = () => {
    completeProtocolMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !signDocumentMutation.isPending && !applySealMutation.isPending && !completeProtocolMutation.isPending) {
      resetAllForms();
      onOpenChange(newOpen);
    }
  };

  const isSigned = signatureInfo?.isSigned || false;
  const hasSeal = signatureInfo?.seal?.applied || false;

  // Auto-advance tab when signature info loads or changes
  useEffect(() => {
    if (isSigned && hasSeal) setActiveTab('complete');
    else if (isSigned) setActiveTab('seal');
  }, [isSigned, hasSeal]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (signDocumentMutation.isPending || applySealMutation.isPending || completeProtocolMutation.isPending) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Protocolo de Firma Ministerial
          </DialogTitle>
          <DialogDescription>
            Firma ministerial y aplicación de sello oficial para el documento #{document.correlativeNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Minister-only security notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Firma Ministerial:</strong> Solo el Ministro puede firmar documentos oficiales.
            Este protocolo requiere autenticación ministerial.
          </AlertDescription>
        </Alert>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signature" disabled={isSigned}>
              {isSigned ? '✓ Firmado' : '1. Firma'}
            </TabsTrigger>
            <TabsTrigger value="seal" disabled={!isSigned || hasSeal}>
              {hasSeal ? '✓ Sellado' : '2. Sello'}
            </TabsTrigger>
            <TabsTrigger value="complete" disabled={!isSigned || !hasSeal}>
              3. Finalizar
            </TabsTrigger>
          </TabsList>

          {/* Signature Tab */}
          <TabsContent value="signature" className="space-y-4">
            {isSigned && (
              <Alert>
                <AlertDescription>
                  Este documento ya ha sido firmado. No se pueden realizar cambios a la firma ministerial.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSignatureSubmit} className="space-y-4">
              {/* Signature Type */}
              <div className="space-y-2">
                <Label htmlFor="signatureType">Tipo de Firma *</Label>
                <Select
                  value={signatureData.signatureType}
                  onValueChange={(value) =>
                    setSignatureData({ ...signatureData, signatureType: value as any })
                  }
                  disabled={isSigned}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="DIGITAL">Solo Digital</SelectItem>
                    <SelectItem value="PHYSICAL">Solo Física</SelectItem>
                    <SelectItem value="BOTH">Ambas (Digital + Física)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Digital Signature Upload */}
              {(signatureData.signatureType === 'DIGITAL' || signatureData.signatureType === 'BOTH') && (
                <div className="space-y-2">
                  <Label htmlFor="digitalSignature">Firma Digital (Imagen) *</Label>
                  <Input
                    id="digitalSignature"
                    type="file"
                    accept="image/*"
                    onChange={handleDigitalSignatureChange}
                    disabled={signDocumentMutation.isPending || isSigned}
                  />
                  {digitalSignature && (
                    <p className="text-sm text-muted-foreground">
                      Archivo seleccionado: {digitalSignature.name}
                    </p>
                  )}
                </div>
              )}

              {/* Physical Signature Scan Upload */}
              {(signatureData.signatureType === 'PHYSICAL' || signatureData.signatureType === 'BOTH') && (
                <div className="space-y-2">
                  <Label htmlFor="physicalSignature">Escaneo de Firma Física (Imagen) *</Label>
                  <Input
                    id="physicalSignature"
                    type="file"
                    accept="image/*"
                    onChange={handlePhysicalSignatureChange}
                    disabled={signDocumentMutation.isPending || isSigned}
                  />
                  {physicalSignatureScan && (
                    <p className="text-sm text-muted-foreground">
                      Archivo seleccionado: {physicalSignatureScan.name}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="signatureNotes">Notas (Opcional)</Label>
                <Textarea
                  id="signatureNotes"
                  placeholder="Observaciones sobre la firma..."
                  value={signatureData.notes}
                  onChange={(e) => setSignatureData({ ...signatureData, notes: e.target.value })}
                  rows={3}
                  disabled={isSigned}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={signDocumentMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={signDocumentMutation.isPending || isSigned}>
                  {signDocumentMutation.isPending ? 'Firmando...' : isSigned ? 'Ya Firmado' : 'Firmar Documento'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Seal Tab */}
          <TabsContent value="seal" className="space-y-4">
            {hasSeal && (
              <Alert>
                <AlertDescription>
                  El sello oficial ya ha sido aplicado a este documento.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSealSubmit} className="space-y-4">
              {/* Applied By */}
              <div className="space-y-2">
                <Label htmlFor="appliedBy">Aplicado por *</Label>
                <Input
                  id="appliedBy"
                  placeholder="Nombre de quien aplica el sello..."
                  value={sealData.appliedBy}
                  onChange={(e) => setSealData({ ...sealData, appliedBy: e.target.value })}
                  required
                  disabled={hasSeal}
                />
              </div>

              {/* Seal Scan Upload */}
              <div className="space-y-2">
                <Label htmlFor="sealScan">Escaneo del Sello (Imagen - Opcional)</Label>
                <Input
                  id="sealScan"
                  type="file"
                  accept="image/*"
                  onChange={handleSealScanChange}
                  disabled={applySealMutation.isPending || hasSeal}
                />
                {sealScan && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {sealScan.name}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="sealNotes">Notas (Opcional)</Label>
                <Textarea
                  id="sealNotes"
                  placeholder="Observaciones sobre el sello..."
                  value={sealData.notes}
                  onChange={(e) => setSealData({ ...sealData, notes: e.target.value })}
                  rows={3}
                  disabled={hasSeal}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={applySealMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={applySealMutation.isPending || hasSeal}>
                  {applySealMutation.isPending ? 'Aplicando...' : hasSeal ? 'Sello Aplicado' : 'Aplicar Sello Oficial'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Complete Tab */}
          <TabsContent value="complete" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El documento ha sido firmado y sellado exitosamente.
                Al completar el protocolo, el documento avanzará a la siguiente etapa del flujo de trabajo.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Resumen del Protocolo</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="font-medium">{document.correlativeNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado de Firma:</span>
                  <span className="font-medium text-green-600">✓ Firmado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado de Sello:</span>
                  <span className="font-medium text-green-600">✓ Aplicado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Siguiente Etapa:</span>
                  <span className="font-medium">
                    {document.direction === 'IN' ? 'Confirmación de Recepción' : 'Impresión y Envío'}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={completeProtocolMutation.isPending}
              >
                Cerrar
              </Button>
              <Button
                onClick={handleCompleteProtocol}
                disabled={completeProtocolMutation.isPending}
              >
                {completeProtocolMutation.isPending ? 'Completando...' : 'Completar Protocolo de Firma'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
