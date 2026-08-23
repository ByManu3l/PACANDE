'use client';

import { MapPin, Pencil, Plus, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { deleteAddressAction, setDefaultAddressAction } from '@/actions/address.actions';
import { AddressFormDialog } from '@/components/forms/address-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AddressFormInput } from '@/lib/validations/address';

export interface AddressRow extends AddressFormInput {
  id: string;
}

/**
 * Libreta de direcciones del cliente.
 *
 * La predeterminada va primero y lleva distintivo: es la que rellena el
 * checkout, y saber cuál es sin abrir nada evita la sorpresa de comprar
 * con la dirección equivocada.
 */
export function AddressList({ initialAddresses }: { initialAddresses: AddressRow[] }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [editando, setEditando] = useState<AddressRow | null>(null);
  const [creando, setCreando] = useState(false);

  const refrescar = () => router.refresh();

  function marcarPredeterminada(id: string) {
    startTransition(async () => {
      const resultado = await setDefaultAddressAction(id);
      if (!resultado.success) {
        toast.error(resultado.error);
        return;
      }
      toast.success('Dirección predeterminada actualizada.');
      refrescar();
    });
  }

  async function eliminar(id: string) {
    const resultado = await deleteAddressAction(id);
    if (!resultado.success) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Dirección eliminada.');
    refrescar();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreando(true)}>
          <Plus className="size-4" />
          Añadir dirección
        </Button>
      </div>

      {initialAddresses.length === 0 ? (
        <div className="text-muted-foreground space-y-3 rounded-lg border border-dashed p-10 text-center">
          <MapPin className="mx-auto size-8" aria-hidden="true" />
          <p>No tienes direcciones guardadas.</p>
          <p className="text-sm">Guarda una y no tendrás que volver a escribirla en cada compra.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {initialAddresses.map((direccion) => (
            <li key={direccion.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {direccion.label}
                    {direccion.isDefault && <Badge variant="secondary">Predeterminada</Badge>}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">{direccion.recipientName}</p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditando(direccion)}
                  aria-label={`Editar la dirección ${direccion.label}`}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>

              <address className="text-muted-foreground text-sm not-italic">
                {direccion.line1}
                {direccion.line2 && <>, {direccion.line2}</>}
                <br />
                {direccion.city}, {direccion.region} {direccion.postalCode}
                <br />
                {direccion.country} · {direccion.phone}
              </address>

              <div className="flex gap-2 pt-1">
                {!direccion.isDefault && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendiente}
                      onClick={() => marcarPredeterminada(direccion.id)}
                    >
                      <Star className="size-3.5" />
                      Usar por defecto
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => eliminar(direccion.id)}
                    >
                      Eliminar
                    </Button>
                  </>
                )}

                {/* La predeterminada también se puede eliminar; el
                    servicio asciende otra automáticamente para que la
                    libreta no quede sin ninguna marcada. */}
                {direccion.isDefault && initialAddresses.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => eliminar(direccion.id)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressFormDialog
        open={creando}
        onOpenChange={setCreando}
        onSaved={refrescar}
        address={null}
      />

      <AddressFormDialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        onSaved={refrescar}
        address={editando}
      />
    </div>
  );
}
