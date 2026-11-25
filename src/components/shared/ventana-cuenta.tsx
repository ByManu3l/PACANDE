import Image from 'next/image';
import Link from 'next/link';

interface VentanaCuentaProps {
  titulo: string;
  children: React.ReactNode;
  /** Frase y enlace para cambiar al otro formulario. */
  alternativa: { pregunta: string; texto: string; href: string };
}

/**
 * Marco de las páginas de entrar y registrarse con el aspecto de la
 * ventana emergente original: una tarjeta negra translúcida de esquinas
 * muy redondeadas sobre el escaparate desenfocado y oscurecido.
 *
 * Aquí es una página y no un modal porque así cada formulario tiene su
 * propia URL —se puede enlazar, recargar y volver con el botón «atrás»—,
 * pero el aspecto es el mismo.
 */
export function VentanaCuenta({ titulo, children, alternativa }: VentanaCuentaProps) {
  return (
    <div className="relative -mx-5 -mt-5 -mb-10 grid min-h-[calc(100vh-112px)] place-items-center overflow-hidden px-4 py-12">
      <Image
        src="/images/brand/carrusel-1.jpg"
        alt=""
        fill
        sizes="100vw"
        className="scale-110 object-cover blur-[8px]"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative w-full max-w-[400px] rounded-[20px] bg-black/80 p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
        <h1 className="mb-6 text-[1.7rem] text-white">{titulo}</h1>
        {children}
        <p className="mt-4 text-[0.9rem] text-white">
          {alternativa.pregunta}{' '}
          <Link href={alternativa.href} className="text-brand font-bold hover:underline">
            {alternativa.texto}
          </Link>
        </p>
      </div>
    </div>
  );
}
