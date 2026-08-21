// Placeholder — categorías, productos, pedidos y usuarios llegan en las
// fases de admin. Esta página solo confirma que el gate de rol funciona.
import { auth } from '@/lib/auth';

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Panel de administración</h1>
      <p className="text-muted-foreground">
        Sesión activa: {session?.user?.name} — rol: {session?.user?.role}
      </p>
    </div>
  );
}
