'use client';

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
    <label className="flex items-center gap-1 text-xs text-white/70">
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
        className="cursor-pointer rounded-md border border-white/20 bg-white/5 px-2 py-1 text-white transition-colors duration-300 hover:border-red-500/60 focus-visible:border-red-600 focus-visible:outline-none disabled:opacity-50"
      >
        {monedas.map((m) => (
          <option key={m} value={m} className="text-black">
            {m}
          </option>
        ))}
      </select>
    </label>
  );
}
