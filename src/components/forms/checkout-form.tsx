'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { checkoutAction } from '@/actions/order.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  CHECKOUT_SERVER_FIELDS,
  type CheckoutFormInput,
  checkoutFormSchema,
} from '@/lib/validations/checkout';

/** Dirección guardada, ya lista para rellenar el formulario. */
export interface DireccionGuardada {
  id: string;
  label: string;
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
}

/**
 * @param couponCode Código que el cliente aplicó en el carrito. Llega por
 *   la URL y se reenvía tal cual; el servidor lo revalida y recalcula el
 *   descuento, así que manipularlo aquí no sirve de nada.
 * @param direcciones Libreta del cliente. La primera es la predeterminada
 *   y se precarga; el resto se pueden elegir con un clic. Si está vacía,
 *   el selector no se muestra.
 */
export function CheckoutForm({
  couponCode,
  direcciones = [],
}: {
  couponCode?: string;
  direcciones?: DireccionGuardada[];
}) {
  const router = useRouter();
  const predeterminada = direcciones[0];

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      country: predeterminada?.country ?? 'CO',
      paymentMethod: 'tarjeta_simulada',
      ...(predeterminada ? aValores(predeterminada) : {}),
    },
  });

  /**
   * Vuelca una dirección guardada en el formulario.
   *
   * Se usa `reset` con los valores actuales por encima en vez de varios
   * `setValue`: así los campos que no forman parte de la dirección —el
   * método de pago, los datos de tarjeta ya escritos— no se pierden al
   * cambiar de dirección.
   */
  function usarDireccion(direccion: DireccionGuardada) {
    reset((actuales) => ({ ...actuales, ...aValores(direccion) }));
  }

  const paymentMethod = watch('paymentMethod');

  const onSubmit = async (values: CheckoutFormInput) => {
    // Solo se envían las claves que el servidor declara aceptar. Los datos
    // de tarjeta se validaron arriba y se quedan en el navegador — nunca
    // deben tocar el backend (ver el porqué en validations/checkout.ts).
    const formData = new FormData();
    for (const field of CHECKOUT_SERVER_FIELDS) {
      const value = values[field];
      if (value) formData.set(field, value);
    }

    if (couponCode) formData.set('couponCode', couponCode);

    const result = await checkoutAction(formData);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('¡Pedido confirmado!');
    router.push(`/checkout/confirmacion/${result.data.orderNumber}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {direcciones.length > 0 && (
        <fieldset className="space-y-2 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Usar una dirección guardada</legend>
          <div className="flex flex-wrap gap-2">
            {direcciones.map((direccion) => (
              <Button
                key={direccion.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => usarDireccion(direccion)}
              >
                {direccion.label}
                <span className="text-muted-foreground ml-1 text-xs">{direccion.city}</span>
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">Dirección de envío</legend>

        <div className="space-y-2">
          <Label htmlFor="recipientName">Nombre de quien recibe</Label>
          <Input id="recipientName" {...register('recipientName')} />
          {errors.recipientName && (
            <p className="text-destructive text-sm">{errors.recipientName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="line1">Dirección</Label>
          <Input id="line1" {...register('line1')} />
          {errors.line1 && <p className="text-destructive text-sm">{errors.line1.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="line2">Complemento (opcional)</Label>
          <Input id="line2" {...register('line2')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" {...register('city')} />
            {errors.city && <p className="text-destructive text-sm">{errors.city.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Departamento</Label>
            <Input id="region" {...register('region')} />
            {errors.region && <p className="text-destructive text-sm">{errors.region.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Código postal</Label>
            <Input id="postalCode" {...register('postalCode')} />
            {errors.postalCode && (
              <p className="text-destructive text-sm">{errors.postalCode.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">Método de pago</legend>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange}>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="tarjeta_simulada" /> Tarjeta de crédito/débito
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="contra_entrega" /> Pago contra entrega
              </Label>
            </RadioGroup>
          )}
        />

        {paymentMethod === 'tarjeta_simulada' && (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">
              Pasarela simulada — no se procesa un pago real. Cualquier tarjeta con 16 dígitos
              funciona; hay un 10% de probabilidad de rechazo simulado.
            </p>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Número de tarjeta</Label>
              <Input id="cardNumber" placeholder="4242424242424242" {...register('cardNumber')} />
              {errors.cardNumber && (
                <p className="text-destructive text-sm">{errors.cardNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardName">Nombre en la tarjeta</Label>
              <Input id="cardName" {...register('cardName')} />
              {errors.cardName && (
                <p className="text-destructive text-sm">{errors.cardName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardExpiry">Vencimiento (MM/AA)</Label>
                <Input id="cardExpiry" placeholder="12/29" {...register('cardExpiry')} />
                {errors.cardExpiry && (
                  <p className="text-destructive text-sm">{errors.cardExpiry.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardCvv">CVV</Label>
                <Input id="cardCvv" placeholder="123" {...register('cardCvv')} />
                {errors.cardCvv && (
                  <p className="text-destructive text-sm">{errors.cardCvv.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </fieldset>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Procesando pago…' : 'Confirmar pedido'}
      </Button>
    </form>
  );
}

/** Campos de una dirección guardada, con los nombres del formulario. */
function aValores(direccion: DireccionGuardada) {
  return {
    recipientName: direccion.recipientName,
    line1: direccion.line1,
    line2: direccion.line2 ?? '',
    city: direccion.city,
    region: direccion.region,
    postalCode: direccion.postalCode,
    country: direccion.country,
    phone: direccion.phone,
  };
}
