'use client';

/**
 * Formulario de contacto de la versión original (nombre, correo y
 * mensaje, con el botón rojo «Enviar»).
 *
 * La plantilla no trae servidor de correo, así que en vez de fingir un
 * envío abre el cliente de correo del visitante con el mensaje ya
 * redactado y dirigido a la tienda. Cuando se conecte un proveedor de
 * correo, este es el punto a cambiar por una Server Action.
 */
export function ContactForm({ destino }: { destino: string }) {
  return (
    <form
      className="flex w-full flex-col items-start"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        const nombre = String(datos.get('nombre') ?? '');
        const correo = String(datos.get('correo') ?? '');
        const mensaje = String(datos.get('mensaje') ?? '');
        const asunto = encodeURIComponent(`Mensaje de ${nombre}`);
        const cuerpo = encodeURIComponent(`${mensaje}\n\n— ${nombre} (${correo})`);
        window.location.href = `mailto:${destino}?subject=${asunto}&body=${cuerpo}`;
      }}
    >
      <label htmlFor="contacto-nombre" className="sr-only">
        Nombre
      </label>
      <input id="contacto-nombre" name="nombre" required placeholder="Nombre" className={CAMPO} />
      <label htmlFor="contacto-correo" className="sr-only">
        Correo Electrónico
      </label>
      <input
        id="contacto-correo"
        name="correo"
        type="email"
        required
        placeholder="Correo Electrónico"
        className={CAMPO}
      />
      <label htmlFor="contacto-mensaje" className="sr-only">
        Mensaje
      </label>
      <textarea
        id="contacto-mensaje"
        name="mensaje"
        required
        placeholder="Escribe tu mensaje aquí..."
        className={`${CAMPO} min-h-[100px]`}
      />
      <div className="flex w-full justify-center">
        <button
          type="submit"
          className="bg-primary hover:bg-brand-dark focus-visible:ring-brand cursor-pointer rounded px-5 py-2.5 text-white transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Enviar
        </button>
      </div>
    </form>
  );
}

const CAMPO =
  'mb-5 w-full rounded border border-[#ccc] bg-white p-2.5 text-[#333] focus:border-primary focus:outline-none';
