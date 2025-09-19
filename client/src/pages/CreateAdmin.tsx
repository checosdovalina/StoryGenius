import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateAdmin() {
  const [result, setResult] = useState<{ success: boolean; message: string; credentials?: any } | null>(null);
  const [loading, setLoading] = useState(false);

  const createAdmin = async () => {
    setLoading(true);
    
    // Primero intentar crear el usuario usando el endpoint de registro normal
    try {
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin',
          email: 'admin@gbsport.com',
          password: 'admin123',
          name: 'Administrador GBSport',
          club: 'GBSport'
        })
      });

      if (registerResponse.ok) {
        setResult({
          success: true,
          message: 'Usuario admin creado exitosamente (como usuario normal - necesita actualización de rol)',
          credentials: {
            email: 'admin@gbsport.com',
            password: 'admin123'
          }
        });
      } else {
        const errorData = await registerResponse.json();
        if (errorData.message && errorData.message.includes('already exists')) {
          setResult({
            success: false,
            message: 'El usuario admin ya existe. Intenta hacer login con: admin@gbsport.com / admin123'
          });
        } else {
          throw new Error(errorData.message || 'Error en registro');
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error creando usuario admin'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Crear Usuario Admin
          </CardTitle>
          <CardDescription>
            Página temporal para crear el usuario administrador en producción
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && (
            <Button 
              onClick={createAdmin} 
              disabled={loading}
              className="w-full"
              data-testid="button-create-admin"
            >
              {loading ? 'Creando...' : 'Crear Usuario Admin'}
            </Button>
          )}

          {result && (
            <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="font-semibold">
                  {result.success ? '¡Éxito!' : 'Error'}
                </AlertDescription>
              </div>
              <AlertDescription className="mt-2">
                {result.message}
              </AlertDescription>
              {result.success && result.credentials && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <p className="text-sm font-semibold">Credenciales:</p>
                  <p className="text-sm">Email: {result.credentials.email}</p>
                  <p className="text-sm">Password: {result.credentials.password}</p>
                  <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded border border-yellow-400">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⚠️ Cambia la contraseña inmediatamente después del primer login
                    </p>
                  </div>
                </div>
              )}
            </Alert>
          )}

          {result?.success && (
            <div className="text-center">
              <Button 
                onClick={() => window.location.href = '/login'} 
                variant="outline"
                data-testid="button-go-login"
              >
                Ir al Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}