import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PhotoUploaderProps {
  currentPhotoUrl?: string | null;
  onPhotoChange: (url: string) => void;
  userName?: string;
  showManualInput?: boolean;
}

export function PhotoUploader({ 
  currentPhotoUrl, 
  onPhotoChange, 
  userName = "Usuario",
  showManualInput = true 
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sincronizar preview con currentPhotoUrl cuando cambia
  useEffect(() => {
    setPreviewUrl(currentPhotoUrl || null);
  }, [currentPhotoUrl]);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo inválido",
        description: "Solo se permiten archivos JPEG, PNG, WEBP y GIF",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo permitido es 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await apiRequest("POST", "/api/media/profile-photo", formData);
      const data = await response.json();

      // Update with server URL
      setPreviewUrl(data.url);
      onPhotoChange(data.url);

      // Invalidar query del usuario para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      toast({
        title: "Foto subida exitosamente",
        description: `Tamaño: ${(data.size / 1024).toFixed(1)} KB`
      });

      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      toast({
        title: "Error al subir la foto",
        description: error.message || "Intenta nuevamente",
        variant: "destructive"
      });
      // Revert preview
      setPreviewUrl(currentPhotoUrl || null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualUrlSubmit = () => {
    if (!manualUrl) {
      toast({
        title: "URL requerida",
        description: "Ingresa una URL de imagen válida",
        variant: "destructive"
      });
      return;
    }

    try {
      new URL(manualUrl); // Validate URL format
      setPreviewUrl(manualUrl);
      onPhotoChange(manualUrl);
      
      // Invalidar query para refrescar
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      setManualUrl("");
      toast({
        title: "URL actualizada",
        description: "La foto de perfil se ha actualizado"
      });
    } catch {
      toast({
        title: "URL inválida",
        description: "Ingresa una URL válida",
        variant: "destructive"
      });
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    onPhotoChange("");
    setManualUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={previewUrl || undefined} alt={userName} />
          <AvatarFallback className="text-lg">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-photo"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir foto
                </>
              )}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                disabled={isUploading}
                data-testid="button-remove-photo"
              >
                <X className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP o GIF. Máximo 5MB.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-photo"
          />
        </div>
      </div>

      {showManualInput && (
        <div className="space-y-2">
          <Label htmlFor="manual-photo-url">O ingresa una URL de imagen</Label>
          <div className="flex gap-2">
            <Input
              id="manual-photo-url"
              type="url"
              placeholder="https://ejemplo.com/foto.jpg"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              disabled={isUploading}
              data-testid="input-photo-url"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleManualUrlSubmit}
              disabled={isUploading || !manualUrl}
              data-testid="button-set-photo-url"
            >
              Usar URL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
