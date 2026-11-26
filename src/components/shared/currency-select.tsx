'use client';

import { ChevronDown } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { setDisplayCurrencyAction } from '@/actions/currency.actions';

interface CurrencySelectProps {
  monedaActual: string;
  monedas: string[];
}

/**
 * Selector de la moneda en la que se muestran los precios.
 *
 * Es un `<select>` nativo a propósito: se maneja con teclado y con lector
 * de pantalla sin código adicional, y en móvil abre la rueda del sistema.
 * Un menú a medida aquí sería más trabajo y peor experiencia.
 *
 * Cambiar la moneda no altera lo que se cobra — ver
 * `exchange-rate.service.ts`—, así que no hay confirmación ni aviso al
 * cambiarla más allá del propio rótulo de la interfaz.
 */
export function CurrencySelect({ monedaActual, monedas }: CurrencySelectProps) {
  const [pendiente, iniciar] = useTransition();

  return (
    <label className="relative flex items-center text-white">
      <span className="sr-only">Moneda en la que se muestran los precios</span>
      <select
        value={monedaActual}
        disabled={pendiente}
        onChange={(e) => {
          const elegida = e.target.value;
          iniciar(async () => {
            const resultado = await setDisplayCurrencyAction(elegida);
            if (!resultado.success) toast.error(resultado.error);
          });
        }}
        // Misma píldora que el buscador: borde rojo tenue, fondo translúcido
        // y borde rojo pleno al pasar o enfocar.
        className="hover:border-brand focus-visible:border-brand cursor-pointer appearance-none rounded-[20px] border-2 border-[rgba(255,0,0,0.3)] bg-white/10 py-1.5 pr-8 pl-4 text-[0.9rem] text-white transition-all duration-300 outline-none hover:bg-white/15 focus-visible:bg-white/15 disabled:opacity-50"
      >
        {monedas.map((m) => (
          <option key={m} value={m} className="bg-black text-white">
            {m}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 size-4 text-white/60"
      />
    </label>
  );
}
