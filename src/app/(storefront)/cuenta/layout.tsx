import { redirect } from 'next/navigation';

import { CuentaNav } from '@/components/shared/cuenta-nav';
import { auth } from '@/lib/auth';

// `proxy.ts` ya redirige las visitas sin sesión fuera de /cuenta/**.
// Esta es la misma comprobación aplicada en el layout, para que un render
// directo de Server Component tampoco pueda saltársela.
//
// Aquí se usa `redirect()` y no el `requireSession()` que lanza: en una
// página, lo correcto es llevar al visitante al login; lanzar mostraría
// una pantalla de error para algo que no lo es.
export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const nombre = session.user.name ?? session.user.email ?? 'Usuario';
  const iniciales = nombre
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-8">
      {/* Cabecera del perfil original: degradado negro, el avatar rojo
          con las iniciales y el nombre en grande. */}
      <header className="flex flex-col items-center gap-6 rounded-2xl bg-linear-135 from-black to-[#333] p-[clamp(1.5rem,4vw,2.5rem)] text-white shadow-[0_8px_25px_rgba(0,0,0,0.15)] sm:flex-row">
        <div
          aria-hidden="true"
          className="bg-brand grid size-[clamp(80px,12vw,120px)] shrink-0 place-items-center rounded-full text-[clamp(2rem,4vw,3rem)] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
        >
          {iniciales}
        </div>
        <div className="text-center sm:text-left">
          <p className="text-[clamp(1.8rem,5vw,2.8rem)] leading-tight font-bold">{nombre}</p>
          {session.user.email && (
            <p className="mt-2 text-[clamp(1rem,3vw,1.3rem)] opacity-90">{session.user.email}</p>
          )}
        </div>
      </header>

      <CuentaNav />

      {/* Tarjeta blanca de esquinas amplias que se eleva al pasar el
          ratón: la del perfil original. */}
      <div className="rounded-2xl bg-white p-[clamp(1.5rem,4vw,2rem)] shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        {children}
      </div>
    </div>
  );
}
