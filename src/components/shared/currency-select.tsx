'use client';

import { ChevronDown } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { setDisplayCurrencyAction } from '@/actions/currency.actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CurrencySelectProps {
  monedaActual: string;
  monedas: string[];
}

/**
 * Selector de la moneda en la que se muestran los precios.
 *
 * Es un menú de Base UI y no un `<select>` nativo porque la lista nativa
 * la pinta el sistema operativo (fondo blanco o negro y resaltado azul) y
 * no admite el estilo de la tienda. El menú conserva lo que daba el nativo:
 * se maneja con flechas e Intro, y el lector de pantalla anuncia un grupo
 * de opciones con la elegida marcada.
 *
 * Cambiar la moneda no altera lo que se cobra — ver
 * `exchange-rate.service.ts`—, así que no hay confirmación ni aviso al
 * cambiarla más allá del propio rótulo de la interfaz.
 */
export function CurrencySelect({ monedaActual, monedas }: CurrencySelectProps) {
  const [pendiente, iniciar] = useTransition();

  const elegir = (elegida: string) => {
    if (elegida === monedaActual) return;
    iniciar(async () => {
      const resultado = await setDisplayCurrencyAction(elegida);
      if (!resultado.success) toast.error(resultado.error);
    });
  };

  return (
    // `modal={false}`: un menú modal bloquea el desplazamiento y oculta la
    // barra de scroll; la ventana gana su ancho y los banners a todo el
    // ancho (100vw) cambian de tamaño mientras el menú está abierto.
    <DropdownMenu modal={false}>
      {/* Misma píldora que el buscador: borde rojo tenue, fondo translúcido
          y borde rojo pleno al pasar o enfocar. */}
      <DropdownMenuTrigger
        disabled={pendiente}
        aria-label={`Moneda de los precios: ${monedaActual}`}
        className="hover:border-brand focus-visible:border-brand aria-expanded:border-brand flex cursor-pointer items-center gap-1.5 rounded-[20px] border-2 border-[rgba(255,0,0,0.3)] bg-white/10 py-1.5 pr-3 pl-4 text-[0.9rem] text-white transition-all duration-300 outline-none hover:bg-white/15 focus-visible:bg-white/15 disabled:opacity-50"
      >
        {monedaActual}
        <ChevronDown aria-hidden="true" className="size-4 text-white/60" />
      </DropdownMenuTrigger>
      {/* Menú negro con borde rojo, como el del usuario: se redefinen las
          variables de color para que los elementos de shadcn hereden la
          paleta (resaltado rojo tenue y texto rojo) sin tocar cada uno. */}
      <DropdownMenuContent
        align="end"
        className="border-brand min-w-28 rounded-lg border bg-black/95 py-1.5 text-white ring-0 [--accent-foreground:#ff0000] [--accent:rgba(255,0,0,0.1)] [--popover-foreground:#fff] [--popover:transparent]"
      >
        <DropdownMenuRadioGroup value={monedaActual} onValueChange={elegir}>
          {monedas.map((m) => (
            <DropdownMenuRadioItem key={m} value={m} className="cursor-pointer px-3 py-1.5">
              {m}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
