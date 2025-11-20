import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type ImportType = "players-singles" | "players-doubles" | "matches-singles" | "matches-doubles";

interface ExcelImportDialogProps {
  tournamentId: string;
}

export function ExcelImportDialog({ tournamentId }: ExcelImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<ImportType | "">("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    created: any[];
  } | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const endpoint = importType?.startsWith('players') 
        ? `/api/tournaments/${tournamentId}/import/players`
        : `/api/tournaments/${tournamentId}/import/matches`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al importar');
      }

      return await res.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      
      // Invalidate relevant queries
      if (importType?.startsWith('players')) {
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'players'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'registrations'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'matches'] });
      }

      toast({
        title: "Importación completada",
        description: `${data.success} registros importados exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en importación",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile || !importType) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona el tipo de importación y un archivo",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    importMutation.mutate(formData);
  };

  const handleDownloadTemplate = () => {
    if (!importType) {
      toast({
        title: "Selecciona tipo de plantilla",
        description: "Primero selecciona el tipo de datos que quieres importar",
        variant: "destructive",
      });
      return;
    }

    const templateUrl = `/api/tournaments/import/templates/${importType}`;
    window.open(templateUrl, '_blank');
  };

  const handleClose = () => {
    setOpen(false);
    setImportType("");
    setSelectedFile(null);
    setImportResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar desde Excel</DialogTitle>
          <DialogDescription>
            Importa jugadores o partidos de forma masiva usando archivos Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="import-type">Tipo de importación</Label>
            <Select value={importType} onValueChange={(value) => setImportType(value as ImportType)}>
              <SelectTrigger id="import-type">
                <SelectValue placeholder="Selecciona qué deseas importar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="players-singles">Jugadores - Singles</SelectItem>
                <SelectItem value="players-doubles">Jugadores - Doubles (Parejas)</SelectItem>
                <SelectItem value="matches-singles">Partidos - Singles</SelectItem>
                <SelectItem value="matches-doubles">Partidos - Doubles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Formato esperado</CardTitle>
                <CardDescription className="text-xs">
                  Tu archivo Excel debe tener estos campos:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-3 rounded-md font-mono text-xs">
                  {importType === 'players-singles' && (
                    <div className="space-y-1">
                      <div>• <strong>nombre</strong>: Nombre del jugador</div>
                      <div>• <strong>categoria</strong> (opcional): PRO Singles IRT | Dobles Open | Amateur A | Amateur B | Amateur C | Principiantes | Juvenil 18 y menores (Varonil) | Juvenil 18 y menores (Femenil) | Dobles AB | Dobles BC | Master 35+ | Master 55+ | Dobles Master 35+</div>
                    </div>
                  )}
                  {importType === 'players-doubles' && (
                    <div className="space-y-1">
                      <div>• <strong>nombrePareja1</strong>: Nombre del primer jugador</div>
                      <div>• <strong>nombrePareja2</strong>: Nombre del segundo jugador</div>
                      <div>• <strong>categoria</strong> (opcional): PRO Singles IRT | Dobles Open | Amateur A | Amateur B | Amateur C | Principiantes | Juvenil 18 y menores (Varonil) | Juvenil 18 y menores (Femenil) | Dobles AB | Dobles BC | Master 35+ | Master 55+ | Dobles Master 35+</div>
                    </div>
                  )}
                  {importType === 'matches-singles' && (
                    <div className="space-y-1">
                      <div>• <strong>fecha</strong>: YYYY-MM-DD (ej: 2024-12-25)</div>
                      <div>• <strong>hora</strong>: HH:MM (ej: 14:30)</div>
                      <div>• <strong>modalidad</strong>: Singles</div>
                      <div>• <strong>jugador1</strong>: Nombre completo del jugador 1</div>
                      <div>• <strong>jugador2</strong>: Nombre completo del jugador 2</div>
                    </div>
                  )}
                  {importType === 'matches-doubles' && (
                    <div className="space-y-1">
                      <div>• <strong>fecha</strong>: YYYY-MM-DD (ej: 2024-12-25)</div>
                      <div>• <strong>hora</strong>: HH:MM (ej: 14:30)</div>
                      <div>• <strong>modalidad</strong>: Doubles</div>
                      <div>• <strong>nombrePareja1</strong>: Jugador 1 del equipo A</div>
                      <div>• <strong>nombrePareja2</strong>: Jugador 2 del equipo A</div>
                      <div>• <strong>nombreRival1</strong>: Jugador 1 del equipo B</div>
                      <div>• <strong>nombreRival2</strong>: Jugador 2 del equipo B</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={!importType}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Archivo Excel</Label>
            <div className="flex items-center gap-2">
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="input-excel-file"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {selectedFile.name}
              </div>
            )}
          </div>

          {importResults && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Importados: {importResults.success}</span>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="flex items-start gap-2 text-destructive">
                      <XCircle className="h-4 w-4 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">Errores: {importResults.errors.length}</span>
                        <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                          {importResults.errors.slice(0, 5).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {importResults.errors.length > 5 && (
                            <li className="italic">... y {importResults.errors.length - 5} más</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {importResults.created.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Registros creados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {importResults.created.slice(0, 10).map((item: any, idx) => (
                        <div key={idx} className="text-xs p-3 bg-muted rounded space-y-1">
                          <div className="flex items-center gap-2 font-medium">
                            <Badge variant="outline" className="text-xs">
                              {idx + 1}
                            </Badge>
                            <span className="flex-1">
                              {item.name || `${item.player1} & ${item.player2}`}
                            </span>
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          {item.credentials && (
                            <div className="ml-8 pl-3 border-l-2 border-blue-200 dark:border-blue-800 space-y-1">
                              {item.credentials.player1 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                  <div className="font-semibold text-blue-700 dark:text-blue-300">{item.player1}</div>
                                  <div>📧 {item.credentials.player1.email}</div>
                                  <div>🔑 {item.credentials.player1.password}</div>
                                </div>
                              )}
                              {item.credentials.player2 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                  <div className="font-semibold text-blue-700 dark:text-blue-300">{item.player2}</div>
                                  <div>📧 {item.credentials.player2.email}</div>
                                  <div>🔑 {item.credentials.player2.password}</div>
                                </div>
                              )}
                              {item.credentials.email && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                  <div>📧 {item.credentials.email}</div>
                                  <div>🔑 {item.credentials.password}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {importResults.created.length > 10 && (
                        <div className="text-xs text-muted-foreground italic text-center pt-2">
                          ... y {importResults.created.length - 10} más
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || !importType || importMutation.isPending}
            data-testid="button-import-execute"
          >
            {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
