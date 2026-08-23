import Link from 'next/link';
import type { ComponentProps } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonLinkProps = ComponentProps<typeof Link> &
  Pick<Parameters<typeof buttonVariants>[0] & object, 'variant' | 'size'>;

/**
 * Un enlace con aspecto de botón.
 *
 * **Por qué no `<Button render={<Link />} nativeButton={false}>`:** esa
 * combinación produce `<a role="button" href="…">`, y ese `role` sustituye
 * al rol implícito de enlace. El resultado es que un lector de pantalla
 * anuncia «botón» para algo que en realidad navega a otra dirección.
 *
 * La distinción no es teórica. Quien usa un lector de pantalla la
 * aprovecha para decidir qué hacer: los enlaces aparecen en la lista de
 * enlaces de la página, se pueden abrir en otra pestaña y anuncian que se
 * va a otro sitio; los botones señalan una acción aquí mismo. Etiquetar
 * mal «Proceder al pago» o «Explorar catálogo» desorienta exactamente en
 * los puntos donde no conviene.
 *
 * Este componente aplica las mismas clases visuales sobre un `<Link>` de
 * verdad, así que se ve igual y se comporta como lo que es.
 *
 * Usa `Button` cuando el control **hace** algo (enviar, abrir un diálogo,
 * alternar) y `ButtonLink` cuando **lleva** a otra parte.
 */
export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
