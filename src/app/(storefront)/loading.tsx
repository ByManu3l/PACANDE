import Image from 'next/image';

/**
 * Pantalla de carga de la versión original: negro a pantalla completa, el
 * logotipo en el centro y un aro rojo girando a su alrededor.
 *
 * El original la mostraba un segundo entero en cada cambio de página, con
 * una espera fingida. Aquí aparece solo mientras el servidor de verdad
 * está trabajando, y con 150 ms de retraso: una navegación rápida no
 * llega a mostrarla, y así no parpadea la pantalla en negro por nada.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="fixed inset-0 z-50 grid animate-[aparecer_0.2s_ease-out_150ms_both] place-items-center bg-black"
    >
      <div className="relative grid size-[100px] place-items-center">
        <span className="border-t-brand absolute inset-0 animate-spin rounded-full border-4 border-transparent motion-reduce:animate-none" />
        <Image
          src="/images/brand/logopaca.png"
          alt=""
          width={80}
          height={60}
          className="relative h-[60px] w-[80px] object-contain"
          priority
        />
      </div>
    </div>
  );
}
