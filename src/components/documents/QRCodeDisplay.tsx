import { QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QRCodeDisplayProps {
  qrCode?: string;
  documentId?: string;
  correlativeNumber?: string;
  size?: 'sm' | 'md' | 'lg';
  showDownload?: boolean;
}

export function QRCodeDisplay({
  qrCode,
  documentId,
  correlativeNumber,
  size = 'md',
  showDownload = true,
}: QRCodeDisplayProps) {
  if (!qrCode) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
  };

  const handleDownloadQR = () => {
    try {
      // Create a link to download the QR code
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `QR_${correlativeNumber || documentId || 'document'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Código QR descargado');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Error al descargar código QR');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5" />
          Código QR del Documento
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <img
            src={qrCode}
            alt={`QR Code for ${correlativeNumber || documentId}`}
            className={`${sizeClasses[size]} object-contain`}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Escanee este código para ver el documento en línea
        </p>
        {showDownload && (
          <Button variant="outline" size="sm" onClick={handleDownloadQR}>
            Descargar QR
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
