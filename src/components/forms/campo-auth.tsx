import type { ComponentProps, ReactNode } from 'react';

interface CampoAuthProps extends ComponentProps<'input'> {
  id: string;
  /** Nombre del campo. Visible solo para lectores de pantalla: a la vista
   * lo hace el `placeholder`, como en la ventana original. */
  label: string;
  icon: ReactNode;
  error?: string;
}

/**
 * Campo de las ventanas de entrar y registrarse, con el aspecto de la
 * versión original: icono a la izquierda, borde blanco sobre fondo negro
 * translúcido, y todo —borde, texto, icono— en rojo al pasar el ratón.
 */
export function CampoAuth({ id, label, icon, error, ...props }: CampoAuthProps) {
  const idError = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="group/campo relative flex w-full items-center">
        <span
          aria-hidden="true"
          className="group-hover/campo:text-brand pointer-events-none absolute left-2.5 text-white transition-colors duration-300 [&_svg]:size-4"
        >
          {icon}
        </span>
        <input
          id={id}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className="group-hover/campo:border-brand group-hover/campo:text-brand group-hover/campo:placeholder:text-brand focus:border-brand w-full rounded-[5px] border border-white bg-black/50 py-3 pr-3 pl-10 text-white transition-colors duration-300 outline-none placeholder:text-white"
          {...props}
        />
      </div>
      {error && (
        <p id={idError} className="mt-1 text-left text-sm text-[#ff8080]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Botón de envío de las ventanas de cuenta: negro con borde blanco y
 * rojo al pasar el ratón, a media anchura y centrado. */
export const BOTON_AUTH =
  'mx-auto mb-6 block w-1/2 min-w-40 cursor-pointer rounded-[5px] border border-white bg-black/80 p-3 text-white transition-colors duration-300 hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-wait disabled:opacity-70';
