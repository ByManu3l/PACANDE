'use client';

import { Camera, Loader2, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { toast } from 'sonner';

import { siteConfig } from '@/lib/config/site.config';

import {
  consultarAsistenteAction,
  type ConsultaAsistente,
  type ProductoSugerido,
} from '@/actions/asistente.actions';

/**
 * Asistente de compras por voz, texto o foto.
 *
 * Pensado primero para quien no puede usar la tienda con comodidad a
 * golpe de ratón: personas con discapacidad visual o motriz, o mayores.
 * Por eso se puede manejar entero con teclado, anuncia cada respuesta a
 * los lectores de pantalla y, si se le habla, contesta en voz alta.
 *
 * El reconocimiento y la síntesis de voz son del propio navegador (Web
 * Speech API): no se envía audio a ningún servidor, solo el texto ya
 * transcrito. Donde el navegador no reconoce voz (Firefox), el botón del
 * micrófono no aparece y queda el texto.
 */

interface Mensaje {
  id: number;
  rol: 'cliente' | 'asistente';
  texto: string;
  foto?: string;
  productos?: ProductoSugerido[];
}

const SUGERENCIAS = [
  'Busco un regalo para alguien que hace deporte',
  '¿Qué ofertas hay en tecnología?',
  'Quiero una camiseta negra',
];

/** Lado mayor de la foto que se envía. Suficiente para reconocer el objeto. */
const LADO_MAXIMO_FOTO = 1024;

export function Asistente() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [vozActiva, setVozActiva] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const [pendiente, iniciar] = useTransition();
  // En el servidor no hay `window`: se renderiza sin micrófono y se
  // decide en el navegador, sin desajuste de hidratación.
  const reconocimientoDisponible = useSyncExternalStore(
    sinSuscripcion,
    () => constructorReconocimiento() !== null,
    () => false,
  );

  const router = useRouter();
  const idPanel = useId();
  const listaRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const reconocimientoRef = useRef<ReconocimientoVoz | null>(null);
  const siguienteId = useRef(0);
  // Copia de `vozActiva` legible desde callbacks asíncronos sin quedar
  // desfasada: la respuesta llega después de que el estado cambió.
  const vozRef = useRef(false);

  function cambiarVoz(activa: boolean) {
    vozRef.current = activa;
    setVozActiva(activa);
    if (!activa) window.speechSynthesis?.cancel();
  }

  // La conversación nueva siempre a la vista.
  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, pendiente]);

  useEffect(() => {
    if (abierto) entradaRef.current?.focus();
  }, [abierto]);

  // Si se cierra el panel, se calla y deja de escuchar.
  useEffect(() => {
    if (!abierto) {
      reconocimientoRef.current?.abort();
      window.speechSynthesis?.cancel();
    }
  }, [abierto]);

  function agregarMensaje(m: Omit<Mensaje, 'id'>) {
    siguienteId.current += 1;
    const nuevo = { ...m, id: siguienteId.current };
    setMensajes((previos) => [...previos, nuevo]);
  }

  function enviar(mensaje: string, foto?: { datos: string; tipo: 'image/jpeg'; vista: string }) {
    const limpio = mensaje.trim();
    if ((!limpio && !foto) || pendiente) return;

    // Solo texto en el historial: la foto viaja una vez, en su turno.
    const historial: ConsultaAsistente['historial'] = mensajes.slice(-10).map((m) => ({
      rol: m.rol,
      texto: (m.foto ? '(Envió una foto) ' : '') + m.texto,
    }));

    agregarMensaje({ rol: 'cliente', texto: limpio, foto: foto?.vista });
    setTexto('');

    iniciar(async () => {
      const resultado = await consultarAsistenteAction({
        mensaje: limpio,
        historial,
        imagen: foto ? { datos: foto.datos, tipo: foto.tipo } : undefined,
      });

      if (!resultado.success) {
        agregarMensaje({ rol: 'asistente', texto: resultado.error });
        setAnuncio(resultado.error);
        hablar(resultado.error);
        return;
      }

      const { respuesta, productos, agregados, noAgregados } = resultado.data;
      agregarMensaje({ rol: 'asistente', texto: respuesta, productos });
      setAnuncio(respuesta);
      hablar(respuesta);

      if (agregados.length > 0) {
        toast.success(`Agregado al carrito: ${agregados.join(', ')}.`);
        router.refresh();
      }
      for (const motivo of noAgregados) toast.error(motivo);
    });
  }

  function hablar(frase: string) {
    if (!vozRef.current || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const locucion = new SpeechSynthesisUtterance(frase);
    locucion.lang = 'es-CO';
    window.speechSynthesis.speak(locucion);
  }

  function alternarMicrofono() {
    if (escuchando) {
      reconocimientoRef.current?.stop();
      return;
    }
    const Constructor = constructorReconocimiento();
    if (!Constructor) return;

    window.speechSynthesis?.cancel();
    const reconocimiento = new Constructor();
    reconocimiento.lang = 'es-CO';
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;

    let transcripcion = '';
    reconocimiento.onresult = (evento) => {
      transcripcion = Array.from(evento.results)
        .map((r) => r[0]?.transcript ?? '')
        .join('');
      setTexto(transcripcion);
    };
    reconocimiento.onerror = (evento) => {
      if (evento.error === 'not-allowed' || evento.error === 'service-not-allowed') {
        toast.error('Permite el uso del micrófono para hablar con el asistente.');
      }
    };
    reconocimiento.onend = () => {
      setEscuchando(false);
      // Quien habla espera que le hablen: se activa la respuesta en voz.
      if (transcripcion.trim()) {
        cambiarVoz(true);
        enviar(transcripcion);
      }
    };

    reconocimientoRef.current = reconocimiento;
    setEscuchando(true);
    reconocimiento.start();
  }

  async function alElegirFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      toast.error('Elige una imagen.');
      return;
    }
    try {
      const foto = await reducirFoto(archivo);
      enviar(texto, foto);
    } catch {
      toast.error('No se pudo leer esa imagen. Prueba con otra.');
    }
  }

  return (
    <>
      {/* Anuncio para lectores de pantalla: la última respuesta, una vez. */}
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>

      {abierto && (
        <section
          id={idPanel}
          aria-label="Asistente de compras"
          className="fixed right-4 bottom-24 z-50 flex h-[min(580px,calc(100dvh-8rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[15px] border border-black/10 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.25)] motion-safe:animate-[aparecer_150ms_ease-out]"
        >
          <header className="flex items-center gap-2 bg-black px-4 py-3 text-white">
            <Sparkles aria-hidden="true" className="text-brand size-5" />
            <h2 className="flex-1 text-base font-bold">Asistente {siteConfig.name}</h2>
            <button
              type="button"
              onClick={() => cambiarVoz(!vozActiva)}
              aria-pressed={vozActiva}
              aria-label="Leer respuestas en voz alta"
              title="Leer respuestas en voz alta"
              className="rounded-full p-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#ff0000] focus-visible:outline-none"
            >
              {vozActiva ? (
                <Volume2 aria-hidden="true" className="size-5" />
              ) : (
                <VolumeX aria-hidden="true" className="size-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="rounded-full p-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#ff0000] focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <div ref={listaRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.length === 0 && (
              <div className="space-y-3 text-sm text-[#555]">
                <p>
                  Hola. Dime qué buscas con tus palabras, pulsa el micrófono para hablar, o envía
                  una foto de algo que te guste y te muestro lo más parecido de la tienda.
                </p>
                <ul className="flex flex-col gap-2">
                  {SUGERENCIAS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => enviar(s)}
                        className="w-full rounded-full border border-[#ddd] px-3 py-1.5 text-left text-[#333] hover:border-[#ff0000] focus-visible:ring-2 focus-visible:ring-[#ff0000] focus-visible:outline-none"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mensajes.map((m) => (
              <div
                key={m.id}
                className={
                  m.rol === 'cliente' ? 'flex flex-col items-end' : 'flex flex-col items-start'
                }
              >
                {m.foto && (
                  // Vista previa local de la foto enviada (data URL).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.foto}
                    alt="Foto enviada"
                    className="mb-1 max-h-32 rounded-lg border border-black/10"
                  />
                )}
                {m.texto && (
                  <p
                    className={
                      m.rol === 'cliente'
                        ? 'bg-primary max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white'
                        : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f4f4f4] px-3 py-2 text-sm text-[#333]'
                    }
                  >
                    <span className="sr-only">{m.rol === 'cliente' ? 'Tú: ' : 'Asistente: '}</span>
                    {m.texto}
                  </p>
                )}
                {m.productos && m.productos.length > 0 && (
                  <ul className="mt-2 grid w-full grid-cols-2 gap-2">
                    {m.productos.map((p) => (
                      <li key={p.slug}>
                        <TarjetaSugerida producto={p} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {pendiente && (
              <p className="flex items-center gap-2 text-sm text-[#666]">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Buscando en la tienda…
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-center gap-1.5 border-t border-black/10 p-3"
          >
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={alElegirFoto}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
            <BotonRedondo
              etiqueta="Buscar con una foto"
              onClick={() => fotoRef.current?.click()}
              disabled={pendiente}
            >
              <Camera aria-hidden="true" className="size-5" />
            </BotonRedondo>
            {reconocimientoDisponible && (
              <BotonRedondo
                etiqueta={escuchando ? 'Dejar de escuchar' : 'Hablar con el asistente'}
                onClick={alternarMicrofono}
                disabled={pendiente}
                activo={escuchando}
              >
                {escuchando ? (
                  <MicOff aria-hidden="true" className="size-5" />
                ) : (
                  <Mic aria-hidden="true" className="size-5" />
                )}
              </BotonRedondo>
            )}
            <label htmlFor={`${idPanel}-entrada`} className="sr-only">
              Escribe qué buscas
            </label>
            <input
              id={`${idPanel}-entrada`}
              ref={entradaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              placeholder={escuchando ? 'Te escucho…' : 'Escribe qué buscas'}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-[#ddd] px-3 py-2 text-sm text-[#333] focus-visible:border-[#ff0000] focus-visible:outline-none"
            />
            <BotonRedondo
              etiqueta="Enviar"
              type="submit"
              disabled={pendiente || !texto.trim()}
              primario
            >
              <Send aria-hidden="true" className="size-4" />
            </BotonRedondo>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        className="bg-primary fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 font-bold text-white shadow-[0_6px_20px_rgba(224,0,0,0.4)] transition-transform hover:scale-105 hover:bg-[#cc0000] focus-visible:ring-4 focus-visible:ring-black/30 focus-visible:outline-none motion-reduce:hover:scale-100"
      >
        {abierto ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Sparkles aria-hidden="true" className="size-5" />
        )}
        {abierto ? 'Cerrar asistente' : 'Asistente'}
      </button>
    </>
  );
}

function TarjetaSugerida({ producto }: { producto: ProductoSugerido }) {
  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-black/10 bg-white text-left hover:border-[#ff0000] focus-visible:ring-2 focus-visible:ring-[#ff0000] focus-visible:outline-none"
    >
      <div className="relative aspect-square bg-[#f5f5f5]">
        {producto.imagen && (
          <Image src={producto.imagen} alt="" fill sizes="180px" className="object-contain p-2" />
        )}
        {producto.descuento > 0 && (
          <span className="bg-primary absolute top-1 right-1 rounded px-1.5 py-0.5 text-[11px] font-bold text-white">
            {producto.descuento}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <span className="line-clamp-2 text-xs font-bold text-[#333]">{producto.nombre}</span>
        <span className="text-sm font-bold text-black">{producto.precio}</span>
        {producto.agotado && <span className="text-xs text-[#c82333]">Agotado</span>}
      </div>
    </Link>
  );
}

function BotonRedondo({
  etiqueta,
  children,
  primario,
  activo,
  type = 'button',
  ...resto
}: {
  etiqueta: string;
  children: React.ReactNode;
  primario?: boolean;
  activo?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={etiqueta}
      title={etiqueta}
      className={[
        'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#ff0000] focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-40',
        primario
          ? 'bg-primary text-white hover:bg-[#cc0000]'
          : activo
            ? 'bg-primary animate-pulse text-white motion-reduce:animate-none'
            : 'bg-[#f4f4f4] text-[#333] hover:bg-[#e8e8e8]',
      ].join(' ')}
      {...resto}
    >
      {children}
    </button>
  );
}

/**
 * Reduce la foto en el navegador antes de enviarla: una de móvil pesa
 * varios megas y el modelo reconoce el objeto igual de bien a 1024 px.
 * Envía menos datos, responde antes y cuesta menos.
 */
async function reducirFoto(archivo: File) {
  const mapa = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(mapa.width, mapa.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(mapa.width * escala);
  lienzo.height = Math.round(mapa.height * escala);
  const contexto = lienzo.getContext('2d');
  if (!contexto) throw new Error('Sin lienzo');
  contexto.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
  mapa.close();
  const vista = lienzo.toDataURL('image/jpeg', 0.85);
  return { datos: vista.slice(vista.indexOf(',') + 1), tipo: 'image/jpeg' as const, vista };
}

// --- Web Speech API -------------------------------------------------------
// Los tipos del reconocimiento de voz no vienen en la librería DOM de
// TypeScript (sigue siendo un estándar en borrador). Solo lo que se usa.

interface ResultadoVoz {
  readonly results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface ErrorVoz {
  readonly error: string;
}
interface ReconocimientoVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((evento: ResultadoVoz) => void) | null;
  onerror: ((evento: ErrorVoz) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type ConstructorReconocimiento = new () => ReconocimientoVoz;

/** El soporte de voz no cambia durante la visita: no hay nada a lo que suscribirse. */
function sinSuscripcion() {
  return () => {};
}

function constructorReconocimiento(): ConstructorReconocimiento | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
