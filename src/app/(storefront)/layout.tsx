import { Footer } from '@/components/shared/footer';
import { Navbar } from '@/components/shared/navbar';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip bg-white">
      <Navbar />
      {/* 1400 px de ancho útil con 20 px de margen: el lienzo de la
          versión original. */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pt-5 pb-10">{children}</main>
      <Footer />
    </div>
  );
}
