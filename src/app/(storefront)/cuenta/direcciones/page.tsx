import { AddressList } from '@/components/forms/address-list';
import { requireSession } from '@/lib/auth/guards';
import { listAddresses } from '@/lib/services/address.service';

export const metadata = { title: 'Direcciones' };

export default async function DireccionesPage() {
  const user = await requireSession();
  const direcciones = await listAddresses(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="before:bg-brand flex items-center gap-2.5 text-[1.3rem] font-semibold text-black before:block before:h-6 before:w-1 before:rounded">
          Direcciones
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          La predeterminada se rellena sola en el checkout. Editarla o eliminarla no cambia a dónde
          se enviaron tus compras anteriores: cada pedido guarda su propia copia.
        </p>
      </div>

      <AddressList
        initialAddresses={direcciones.map((d) => ({
          id: d.id,
          label: d.label,
          recipientName: d.recipientName,
          line1: d.line1,
          line2: d.line2 ?? undefined,
          city: d.city,
          region: d.region,
          postalCode: d.postalCode,
          country: d.country,
          phone: d.phone,
          isDefault: d.isDefault,
        }))}
      />
    </div>
  );
}
