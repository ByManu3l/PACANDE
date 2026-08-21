export default function PrivacyPage() {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-2xl">
      <h1>Política de privacidad</h1>
      <p className="text-muted-foreground text-sm">
        Contenido de ejemplo — reemplázalo con la política real de tu negocio antes de operar en
        producción.
      </p>
      <h2>1. Datos que recopilamos</h2>
      <p>
        Nombre, correo y dirección de envío al registrarte o realizar un pedido. Nunca almacenamos
        tu contraseña en texto plano ni compartimos tus datos con terceros sin tu consentimiento.
      </p>
      <h2>2. Uso de los datos</h2>
      <p>Usamos tus datos únicamente para procesar pedidos, gestionar tu cuenta y contactarte.</p>
      <h2>3. Tus derechos</h2>
      <p>
        Puedes solicitar la actualización o eliminación de tus datos escribiendo a{' '}
        <a href="/contacto">contacto</a>.
      </p>
    </div>
  );
}
