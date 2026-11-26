import { describe, expect, it } from 'vitest';

import { buscarEnCatalogo, palabrasClave } from '@/lib/utils/busqueda-local';

const CATALOGO = [
  { slug: 'gorra', nombre: 'Gorra Negra', categoria: 'Ropa > Hombre' },
  { slug: 'camiseta-negra', nombre: 'Camiseta Negra', categoria: 'Ropa > Hombre' },
  { slug: 'camiseta-roja', nombre: 'Camiseta Roja', categoria: 'Ropa > Mujer' },
  { slug: 'balon', nombre: 'Balón de Fútbol', categoria: 'Deportes > Fútbol' },
  { slug: 'audifonos', nombre: 'Audífonos Bluetooth', categoria: 'Tecnología > Accesorios' },
];

describe('búsqueda por palabras', () => {
  it('quita el relleno de una frase dictada', () => {
    expect(palabrasClave('Quiero una camiseta negra, por favor')).toEqual(['camiseta', 'negra']);
  });

  it('ignora tildes, mayúsculas y plurales', () => {
    expect(buscarEnCatalogo(CATALOGO, 'BALONES de futbol').map((p) => p.slug)).toEqual(['balon']);
    expect(buscarEnCatalogo(CATALOGO, 'audifonos').map((p) => p.slug)).toEqual(['audifonos']);
  });

  it('pone primero lo que coincide con más palabras', () => {
    const r = buscarEnCatalogo(CATALOGO, 'busco una camiseta negra').map((p) => p.slug);
    expect(r[0]).toBe('camiseta-negra');
    expect(r).toContain('camiseta-roja');
    expect(r).toContain('gorra');
  });

  it('el nombre pesa más que la categoría', () => {
    const r = buscarEnCatalogo(CATALOGO, 'algo de fútbol').map((p) => p.slug);
    expect(r).toEqual(['balon']);
  });

  it('sin palabras útiles no devuelve nada', () => {
    expect(buscarEnCatalogo(CATALOGO, 'hola, quiero algo por favor')).toEqual([]);
    expect(buscarEnCatalogo(CATALOGO, 'nevera')).toEqual([]);
  });
});
