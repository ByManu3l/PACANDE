'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { removeFromCartAction, updateCartItemAction } from '@/actions/cart.actions';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/currency';

interface CartItemRowProps {
  item: {
    productId: string;
    quantity: number;
    product: { name: string; slug: string; price: string; images: string[]; stock: number };
  };
}

export function CartItemRow({ item }: CartItemRowProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const runUpdate = (quantity: number) => {
    startTransition(async () => {
      const result = await updateCartItemAction(item.productId, quantity);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  };

  const runRemove = () => {
    startTransition(async () => {
      const result = await removeFromCartAction(item.productId);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4 border-b py-4 last:border-0">
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
        {item.product.images[0] && (
          <Image
            src={item.product.images[0]}
            alt={item.product.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/producto/${item.product.slug}`}
          className="line-clamp-1 font-medium hover:underline"
        >
          {item.product.name}
        </Link>
        <p className="text-muted-foreground text-sm">{formatPrice(item.product.price)}</p>
      </div>

      <div className="flex items-center rounded-lg border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isPending}
          onClick={() => runUpdate(item.quantity - 1)}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-8 text-center text-sm">{item.quantity}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isPending || item.quantity >= item.product.stock}
          onClick={() => runUpdate(item.quantity + 1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <p className="w-24 text-right font-medium">
        {formatPrice(Number(item.product.price) * item.quantity)}
      </p>

      <Button type="button" variant="ghost" size="icon" disabled={isPending} onClick={runRemove}>
        <Trash2 className="text-destructive size-4" />
      </Button>
    </div>
  );
}
