// Navbar/Footer se agregan cuando se construya el catálogo (fase de storefront);
// por ahora este layout solo agrupa las rutas públicas bajo un contenedor común.
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>;
}
