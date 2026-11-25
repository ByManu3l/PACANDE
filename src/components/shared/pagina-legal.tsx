interface PaginaLegalProps {
  titulo: string;
  aviso: string;
  secciones: { titulo: string; contenido: React.ReactNode }[];
}

/**
 * Plantilla de las páginas de términos y privacidad, con el aspecto de la
 * versión original: titular rojo centrado y cada apartado en su propia
 * caja gris clara con sombra suave, a 800 px de ancho.
 */
export function PaginaLegal({ titulo, aviso, secciones }: PaginaLegalProps) {
  return (
    <div className="px-0 py-5 text-black sm:py-10">
      <h1 className="text-primary mb-5 text-center text-[2.23rem] lg:text-[2.625rem]">{titulo}</h1>
      <p className="mx-auto max-w-[800px] text-center text-sm text-[#666]">{aviso}</p>
      {secciones.map((s) => (
        <section
          key={s.titulo}
          className="[&_a]:text-primary mx-auto my-5 max-w-[800px] rounded-[5px] bg-[#f8f8f8] p-5 shadow-[0_2px_5px_rgba(0,0,0,0.1)] [&_a]:font-semibold [&_a]:hover:text-[#d40000]"
        >
          <h2 className="mb-2.5 text-[1.5rem] text-black">{s.titulo}</h2>
          <p className="leading-relaxed">{s.contenido}</p>
        </section>
      ))}
    </div>
  );
}
