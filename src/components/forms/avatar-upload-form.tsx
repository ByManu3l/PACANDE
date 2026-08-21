'use client';

import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { toast } from 'sonner';

import { uploadAvatarAction } from '@/actions/user.actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarUploadFormProps {
  name: string;
  image: string | null;
}

export function AvatarUploadForm({ name, image }: AvatarUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set('avatar', file);

    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Foto de perfil actualizada.');
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {image && <AvatarImage src={image} alt={name} />}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>
      <div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="text-primary flex items-center gap-1 text-sm font-medium hover:underline disabled:opacity-50"
        >
          <Camera className="size-4" /> {isPending ? 'Subiendo…' : 'Cambiar foto'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
