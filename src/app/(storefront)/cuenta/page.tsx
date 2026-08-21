// Placeholder — el perfil completo (avatar, cambio de contraseña,
// historial de pedidos) llega en la fase de área de cuenta.
import { auth } from '@/lib/auth';

export default async function CuentaPage() {
  const session = await auth();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <p className="text-muted-foreground">
        Hola, {session?.user?.name} ({session?.user?.email}) — rol: {session?.user?.role}
      </p>
    </div>
  );
}
