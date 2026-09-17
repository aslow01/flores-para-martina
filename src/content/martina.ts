/**
 * TODO EL TEXTO DE LA PÁGINA VIVE ACÁ.
 *
 * Si querés cambiar una frase, la firma, la fecha o un dato, es en este archivo.
 * Nada de esto está repetido en los componentes: cada sección lee de acá.
 *
 * Convenciones:
 *  - Se le habla de vos (rioplatense).
 *  - Nada de emojis. Nada de frases de plantilla.
 *  - Los datos que se afirman tienen fuente (ver `fuentes` al final).
 */

export const persona = {
  ella: 'Martina',
  apellido: 'Maureira',
  el: 'Matías',
  /** Cómo firma la carta. */
  firma: 'Matías',
} as const;

/** La fecha ancla: primavera austral, hora de Buenos Aires. */
export const fecha = {
  anio: 2026,
  mes: 9,
  dia: 21,
  zona: 'America/Argentina/Buenos_Aires',
  /** Instante en que "empieza" el 21/09/2026 en Buenos Aires (UTC-3, sin horario de verano). */
  iso: '2026-09-21T00:00:00-03:00',
} as const;

export const meta = {
  titulo: 'Flores amarillas para Martina',
  descripcion:
    'Un ramo de 21 flores amarillas que no se marchitan. Hecho a mano, línea por línea, para Martina Maureira.',
  /** Cambiá esto por la URL final cuando esté publicada (se usa para la vista previa al compartir). */
  url: 'https://aslow01.github.io/flores-para-martina/',
  /** Link al repositorio (aparece en el colofón). Dejalo vacío para ocultarlo. */
  repo: '',
  /** Peso medido del sitio, en KB transferidos. Se actualiza con `npm run qa`. */
  pesoKb: 261,
} as const;

export const intro = {
  log: ['abriendo flores-para-martina', 'plantando 21 flores amarillas', 'listo.'],
  saltar: 'Saltar la intro',
} as const;

export const portada = {
  fechaCorta: '21 · 09 · 2026',
  para: `para ${persona.ella} ${persona.apellido}`,
  /** Tres líneas del titular. La última va en itálica. */
  titulo: ['Martina,', 'te traje', 'flores amarillas.'],
  bajada:
    'Virtuales, sí. Pero las planté yo, una por una, en el único idioma en el que no me trabo.',
  hint: 'Deslizá',
  hintLargo: 'Hay un ramo más abajo.',
  /** Texto alternativo del campo de flores (para lectores de pantalla). */
  altCampo:
    'Un campo de flores amarillas dibujadas con código, meciéndose con el viento.',
} as const;

export const tradicion = {
  eyebrow: 'Por qué amarillas',
  titulo: 'Una promesa de novela, un 21 de septiembre y una florería sin amarillo.',
  parrafos: [
    'La cosa arranca en 2004, en Canal 13. En Floricienta, la protagonista tenía un sueño simple: que el hombre que la quisiera le regalara flores amarillas. Al año siguiente la promesa se volvió canción.',
    'Casi veinte años después, TikTok desenterró la escena y la volvió costumbre: cada 21 de septiembre, cuando arranca la primavera de este lado del mundo, se regalan flores amarillas. Y el que las regala, dicen, es el que se queda.',
    'Tanta gente se sumó que en 2023 las florerías de Buenos Aires se quedaron sin stock y terminaron pintando flores de amarillo con aerosol. Antes de eso, el amarillo era el color que nadie pedía.',
  ],
  remate: 'Yo no soy de novelas. Pero entendí la parte importante.',
  notaMargen: 'sí, lo googleé. Está en Infobae.',
  notaMargenUrl:
    'https://www.infobae.com/sociedad/2023/09/21/tiktok-y-una-cancion-de-floricienta-revolucionaron-el-dia-de-la-primavera-el-boom-de-las-flores-amarillas/',
} as const;

export const ramo = {
  eyebrow: 'La entrega',
  tituloCerrado: 'Tu ramo.',
  instruccion: 'Tirá de la cinta hacia abajo.',
  instruccionTeclado: 'o apretá el botón',
  instruccionSinMovimiento: 'Apretá el botón para abrirlo.',
  botonAbrir: 'Abrir el ramo',
  tituloAbierto: 'Son 21. Por la fecha.',
  bajadaAbierto:
    'Ninguna es igual a otra, y siempre van a ser estas: el código las dibuja cada vez que abrís la página, con tu nombre como semilla. Las tuyas.',
  etiqueta: `para ${persona.ella}`,
  leerTarjeta: 'Hay una tarjeta',
  altRamo: 'Un ramo de 21 flores amarillas envuelto en papel kraft y atado con una cinta azul.',
} as const;

export const carta = {
  eyebrow: 'La tarjeta',
  saludo: 'Amor,',
  parrafos: [
    'No soy de escribir estas cosas. Lo sabés: me cuesta. No es que no sienta: es que lo que siento se me traba en algún lugar entre la cabeza y la boca, y ahí se queda. Mi vida pasa frente al azul de una pantalla, y adentro de esa pantalla me manejo bien. Afuera, con esto, no tanto.',
    'Vos sos otra cosa. Sentís las cosas de frente, sin pedir permiso. Las decís, las llorás, las festejás. No las guardás en un cajón para más adelante. Yo no soy muy de amor; capaz soy todo lo contrario. Y vos sos todo lo que yo no tengo. No lo digo con tristeza: es exactamente por eso que estoy acá.',
    'Así que hice esto. Con lo único que sé hacer bien con las manos, que es escribir código, te armé un ramo. Cada flor de esta página la planté yo, línea por línea. No se marchitan, no hay que cambiarles el agua y podés venir a verlas las veces que quieras, a la hora que sea. Es mi manera de decirte que no todo es trabajo. Que hay una parte de mí que es tuya, aunque no la muestre seguido.',
  ],
  /**
   * El párrafo con la tachadura. `antes` es la palabra impresa que se tacha a mano,
   * `medio` la corrección manuscrita que también se tacha, `despues` la definitiva.
   */
  correccion: {
    previo: 'Cada vez que entres acá, acordate de esto: de mi',
    antes: 'aprecio',
    medio: 'cariño',
    despues: 'amor',
    posterior: 'por vos. Aunque me cueste decirlo. Aunque lo diga poco.',
  },
  despedida: 'Feliz primavera, Martina.',
  firma: persona.firma,
  pdEtiqueta: 'P.D.',
  pd: 'Si encontraste esto, es porque sos curiosa. Ya lo sabía. Hay otra cosa escondida en esta página: escribí tu nombre, así, sin más. Desde una computadora, en cualquier momento; desde el celular, acá abajo.',
  pdCampo: 'escribí tu nombre acá',
} as const;

export const notas = {
  eyebrow: 'Notas al margen',
  titulo: 'Cosas que aprendí armando esto.',
  items: [
    {
      especie: 'girasol',
      texto:
        'Los girasoles jóvenes siguen al sol de este a oeste durante el día. De noche, sin que nadie los mire, vuelven solos a mirar al este para esperarlo.',
      pie: 'Science, 2016',
    },
    {
      especie: 'girasol',
      texto:
        'En el centro de un girasol hay 34 espirales para un lado y 55 para el otro. Fibonacci, en serio. Lo contaron en cientos de girasoles y en tres de cada cuatro daba.',
      pie: 'Royal Society Open Science, 2016',
    },
    {
      especie: 'margarita',
      texto:
        'El 21 de septiembre acá también es el Día del Estudiante. Lo propuso un alumno en 1902, porque ese día, en 1888, habían llegado a Buenos Aires los restos de Sarmiento.',
      pie: 'UBA',
    },
    {
      especie: 'ranunculo',
      texto:
        'Esta página no tiene base de datos, ni cuenta, ni publicidad. Es un archivo con tu nombre adentro, guardado donde guardo todo lo que hago.',
      pie: 'GitHub Pages',
    },
    {
      especie: 'boton',
      texto: 'Pesa menos que una sola foto de tu celular. Lo digo porque lo medí.',
      pie: 'Ver el colofón',
      enlace: '#colofon',
    },
  ],
} as const;

/**
 * El contador se arma en tres partes: un prefijo chico, un número grande y una etiqueta.
 * Antes del 21: "Faltan  6  días para el 21." — El 21: "Hoy  21  de septiembre." —
 * Después: "Estas flores llevan  40  días sin marchitarse."
 */
export const contador = {
  eyebrow: 'Sin marchitarse',
  antes: {
    prefijo: (n: number) => (n === 1 ? 'Falta' : 'Faltan'),
    numero: (n: number) => String(n),
    etiqueta: (n: number) => (n === 1 ? 'día para el 21.' : 'días para el 21.'),
    bajada: 'No iba a esperar. Estas ya están abiertas.',
  },
  hoy: {
    prefijo: () => 'Hoy es',
    numero: () => '21',
    etiqueta: () => 'de septiembre.',
    bajada: 'Y estas ya estaban abiertas. Feliz primavera.',
  },
  despues: {
    prefijo: () => 'Estas flores llevan',
    numero: (n: number) => String(n),
    etiqueta: (n: number) => (n === 1 ? 'día sin marchitarse.' : 'días sin marchitarse.'),
    bajada: 'Desde el 21 de septiembre de 2026. Y van a seguir.',
  },
  detalle: (h: number, m: number) => `y ${h} ${h === 1 ? 'hora' : 'horas'}, ${m} ${m === 1 ? 'minuto' : 'minutos'}`,
} as const;

export const cierre = {
  titulo: 'Feliz primavera, Martina.',
  bajada: 'Volvé cuando quieras. Acá van a estar.',
  botonVolver: 'Volver a abrir el ramo',
} as const;

export const colofon = {
  texto:
    'Hecho a mano por Matías con Astro 7, TypeScript, GSAP y Lenis. Sin base de datos y sin canción de fondo. Ninguna flor es una imagen: se dibujan con código cada vez que abrís la página.',
  tipografia: 'Tipografía: Fraunces, Alegreya y Nothing You Could Do.',
  peso: (kb: number) => (kb > 0 ? `Pesa ${kb} KB, fuentes incluidas.` : ''),
  codigo: 'Ver el código',
  fuentesTitulo: 'De dónde salieron los datos',
} as const;

export const huevos = {
  /** Se activan escribiendo estas palabras en cualquier momento (sin acentos, da igual). */
  martina: 'Sí. Vos.',
  matias: 'Acá estoy.',
} as const;

export const fuentes = [
  {
    texto: 'Floricienta, Canal 13, 2004–2005',
    url: 'https://es.wikipedia.org/wiki/Floricienta',
  },
  {
    texto: 'La canción «Flores amarillas», 2005',
    url: 'https://es.wikipedia.org/wiki/Flores_amarillas',
  },
  {
    texto: 'UBA: por qué el 21 de septiembre es el Día del Estudiante',
    url: 'https://www.uba.ar/ubaciencia/noticias/399',
  },
  {
    texto: 'Infobae, 21/09/2023: el boom de las flores amarillas',
    url: 'https://www.infobae.com/sociedad/2023/09/21/tiktok-y-una-cancion-de-floricienta-revolucionaron-el-dia-de-la-primavera-el-boom-de-las-flores-amarillas/',
  },
  {
    texto: 'Atamian et al., Science, 2016: heliotropismo de los girasoles',
    url: 'https://phys.org/news/2016-08-sunflowers-clock.html',
  },
  {
    texto: 'Swinton et al., Royal Society Open Science, 2016: espirales de Fibonacci',
    url: 'https://plus.maths.org/sunflowers',
  },
] as const;

export const cuatrocientoscuatro = {
  titulo: 'Esta flor no existe.',
  bajada: 'O todavía no la planté. Volvé al ramo.',
  boton: 'Volver al ramo',
} as const;
