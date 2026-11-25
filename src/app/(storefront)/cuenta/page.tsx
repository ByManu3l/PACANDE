import { redirect } from 'next/navigation';

import { AvatarUploadForm } from '@/components/forms/avatar-upload-form';
import { ProfileForm } from '@/components/forms/profile-form';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/services/user.service';

export default async function CuentaPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = await getUserById(session.user.id);
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <h1 className="before:bg-brand flex items-center gap-2.5 text-[1.3rem] font-semibold text-black before:block before:h-6 before:w-1 before:rounded">
        Mi perfil
      </h1>
      <AvatarUploadForm name={user.name} image={user.image} />
      <ProfileForm defaultValues={{ name: user.name, email: user.email }} />
    </div>
  );
}
