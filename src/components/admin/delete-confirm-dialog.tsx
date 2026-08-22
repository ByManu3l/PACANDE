'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/utils/action-result';

interface DeleteConfirmDialogProps {
  /** Nombre de lo que se va a borrar, para que el mensaje sea inequívoco. */
  itemName: string;
  /** Advertencia específica del tipo de registro (p. ej. qué pasa con los
   * pedidos asociados). Se muestra bajo el título. */
  description: string;
  /** La Server Action de borrado. Debe devolver un `ActionResult`. */
  onConfirm: () => Promise<ActionResult<unknown>>;
  /** Se ejecuta solo si el borrado tuvo éxito, para refrescar la tabla. */
  onDeleted: () => void;
  successMessage: string;
}

/**
 * Confirmación de borrado para las tablas del panel de administración.
 *
 * Existía copiada casi carácter por carácter en las tres tablas
 * (categorías, productos y usuarios), incluido el manejo de estado que se
 * explica abajo. Al tercer duplicado se extrajo.
 *
 * **Sobre el estado controlado:** `AlertDialogAction` en esta versión de
 * shadcn (sobre Base UI) es un `<Button>` sin lógica de cierre incorporada
 * — a diferencia de la implementación sobre Radix, que cierra el diálogo
 * al hacer clic. Si se deja sin controlar, el diálogo se queda abierto
 * tras confirmar. Por eso `open` se maneja explícitamente y se cierra
 * cuando la acción termina, con éxito o sin él.
 */
export function DeleteConfirmDialog({
  itemName,
  description,
  onConfirm,
  onDeleted,
  successMessage,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Se cierra el diálogo pase lo que pase: si la acción falla, el motivo
  // se explica en el toast (p. ej. "no se puede eliminar: tiene pedidos
  // asociados"), y dejar además el diálogo abierto encima obligaría al
  // usuario a descartarlo a mano para poder leerlo.
  const handleConfirm = async () => {
    setIsPending(true);
    try {
      const result = await onConfirm();
      setOpen(false);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      onDeleted();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${itemName}`}>
            <Trash2 className="text-destructive size-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar &quot;{itemName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Eliminando…' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
