# Muro — Propuesta de producto, contrato y arquitectura

> Estado: **borrador para aprobación** (no hay código todavía).
> Convención: este documento está en español porque es una conversación contigo; todo lo que entre al repositorio (código, ADRs, commits, docs técnicas) irá en inglés.

---

## 0. Resumen en una página

**Muro** es un único lienzo persistente (el muro de Event Storming) sobre el que ocurre todo el curso. Cada módulo es una *escena*: una secuencia declarativa de operaciones sobre el estado del muro (caer notas, dibujar fronteras, transformar términos, hacer zoom hasta el código). Lo que cambia por industria es **solo datos** (el *domain pack*); lo que cambia por lenguaje es **solo plantillas**; lo que cambia por idioma es **solo catálogos de texto**.

Cuatro ideas estructuran toda la propuesta:

1. **El pack es el contrato central.** Un JSON estricto, con vocabulario *cerrado* para reglas y lógica (sin código libre del LLM). Lo cerrado es lo que permite generar código y tests deterministas.
2. **Un intérprete de referencia en TypeScript** ejecuta el mini-DSL (escenarios, invariantes, transiciones). Con él las animaciones del muro (romper invariantes, pipeline) son instantáneas y no dependen de ningún runtime de lenguaje en el navegador; además sirve de oráculo contra el que se comparan los tests generados en cada lenguaje.
3. **Anclas código ↔ nota.** Las plantillas marcan qué rango de líneas nace de qué concepto del pack. Eso hace posible el zoom semántico donde "el código emerge de las notas".
4. **El proyecto practica lo que enseña.** La generación de un pack es un pipeline con tipos por etapa (`Candidate → SchemaValid → SemanticallyValid → Executable`) y errores como valores; la UI de generación *dibuja ese mismo pipeline*.

Hay cuatro puntos donde propongo **ir más allá o corregir** lo que pediste; están marcados con 🔶 y resumidos en la sección 8 para que decidas.

---

## 1. Experiencia y diseño visual

### 1.1 Anatomía de la pantalla

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◧ Muro   7 · Bloques tácticos        [ES-MX ▾] [TypeScript ▾] [Hecho a Mano ▾] ⚙ │
├────┬───────────────────────────────────────────────────────┬───────────────┤
│ 1  │                                                       │ Narración     │
│ 2  │        M U R O   (cámara con pan + zoom semántico)    │ (diálogo del  │
│ 3  │                                                       │  experto +    │
│ 4  │   [Pedido     ]──▶(Pedido realizado)                  │  explicación) │
│ 5  │                                                       ├───────────────┤
│ 6  │                                                       │ Código  ⇄     │
│ 7● │                                                       │ Antes/Después │
│ 8  │                                                       │ [Ejercicio]   │
├────┴───────────────────────────────────────────────────────┴───────────────┤
│ ◀ ▶  ──●─────────────  paso 4/9      Modo demo ▢     Ver código ↗          │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Riel izquierdo**: mapa del curso (10 módulos, progreso por concepto).
- **Muro**: ocupa ≥ 60 % de la pantalla. Es el protagonista; los paneles se pueden ocultar.
- **Panel derecho**: narración (diálogo de los expertos + explicación del concepto, con variante por lenguaje), código, ejercicio.
- **Barra inferior**: *scrubber* de la escena. Como la escena es una secuencia de estados puros, se puede retroceder y avanzar a cualquier paso. Es oro para grabar demos (se repite una toma sin recargar).

### 1.2 Lenguaje visual

| Elemento | Decisión |
|---|---|
| Fondo | Pizarrón claro (marfil/gris cálido) con grano sutil (SVG noise de baja opacidad, sin imágenes pesadas). Variante oscura = pizarrón de grafito; las notas conservan sus colores. |
| Notas | Cuadrados con leve rotación determinista (semilla = `codeName`), sombra suave, esquina levemente doblada. Caen con resorte y se "asientan". |
| Trazos a mano | Fronteras, flechas y subrayados con trazos irregulares con semilla fija (el mismo muro se ve idéntico en cada grabación). SVG superpuesto al muro; animación con `stroke-dashoffset`. |
| UI de producto | Paneles limpios, bordes finos, radio 10–12 px, sombras discretas. Contrasta *a propósito* con el muro: el muro es artesanal, el producto es preciso. |
| Tipografía | Notas: manuscrita legible (candidatas: Kalam / Patrick Hand; se decide en pruebas a 4K con tildes y ñ). UI: Inter. Código: JetBrains Mono. Todas OFL, autoalojadas (sin CDN). |
| Escala | Unidades relativas al viewport; la escena se compone sobre un escenario 16:9 opcional para grabar a 1080p/4K sin sorpresas. |

**Colores de la convención** (texto `#2B2A28` sobre todos: contraste > 7:1)

| Nota | Color | Tamaño / marca |
|---|---|---|
| Evento de dominio | naranja `#FFA94D` | estándar |
| Comando | azul `#74C0FC` | estándar |
| Actor | amarillo pálido `#FFF3BF` | pequeño, con ícono de persona |
| Política | lila `#D0BFFF` | estándar ("cuando X → entonces Y") |
| Sistema externo | rosa `#FFA8C5` | estándar |
| Modelo de lectura | verde `#B2F2BB` | estándar |
| Agregado | amarillo `#FFE066` | **grande**, con borde de papel (se distingue del actor por tamaño y forma) |
| Hotspot / duda | magenta `#FF6B9D` | etiqueta pequeña con "?" |

Tema configurable mediante *design tokens* (CSS custom properties). El host puede mandar `{ mode, tokens? }` por el protocolo y el curso se adapta.

### 1.3 Tecnología del muro (resumen; ADR propio)

- **Estado del muro = máquina pura**: `WallState` + `WallCommand → WallState` (reducer). Notas, fronteras, flechas, cámara, nivel de zoom. Testeable con Vitest sin DOM.
- **Escena = datos**: lista de pasos, cada paso es una lista de `WallCommand` + referencias a textos (claves i18n o diálogos del pack). Nunca texto literal.
- **Reproductor de escenas**: calcula el *diff* entre estados y lo anima. Saltar a un paso = aplicar el estado destino sin transiciones.
- **Render**: notas como DOM absoluto dentro de un contenedor con `transform` (la cámara); fronteras y flechas en una capa SVG; animación con Motion (resortes + secuencias) y `roughjs` o un generador propio de trazos con semilla. Un muro serio ronda 40–90 notas: DOM es suficiente y accesible.
- **Accesibilidad**: navegación por teclado, narración en región `aria-live`, `prefers-reduced-motion` sustituye caídas y trazos por fundidos.

### 1.4 Zoom semántico (el momento "wow" principal)

No es solo escalar: cada nivel tiene *su propia representación* (nivel de detalle) y la cámara hace de transición.

| Nivel | Qué se ve | Cómo se llega |
|---|---|---|
| L0 Muro completo | todas las notas en su línea de tiempo, colores, fronteras | estado base |
| L1 Contexto | las notas del contexto se agrandan, el resto se atenúa; el vocabulario local aparece | clic en la frontera / `Z` |
| L2 Agregado | el agregado se abre: estados, comandos que entran, eventos que salen, reglas (notas pequeñas "regla" que cuelgan del agregado) | clic en la nota amarilla |
| L3 Código | el código del agregado **emerge**: cada bloque vuela desde la nota que lo originó (animación FLIP de la nota al rango de líneas) | `Z` otra vez |

Mecanismo: el generador devuelve `{ code, anchors: [{ ref: "Order.rule.OrderMustHaveLines", lines: [23, 24] }] }`. Pasar el cursor por una línea resalta su nota y viceversa. Es la misma estructura en los cuatro lenguajes, así que la animación es única.

### 1.5 Los otros momentos "wow"

1. **Cambio de negocio (módulo 1)**: llega un requisito; en el modelo anémico una onda roja se propaga por 5–6 "archivos" (controlador, servicio, job, importador…) y en el rico se ilumina un solo lugar. 🔶 *El modelo anémico se genera del mismo spec con una plantilla "ingenua"; es una caricatura ilustrativa y se rotula como tal.*
2. **Glosario vivo (módulo 2)**: en el diálogo, los términos se subrayan; al terminar la frase, el término "vuela" al glosario. Un término ambiguo pulsa en ámbar.
3. **Línea de tiempo (módulo 3)**: las notas naranjas caen y el usuario puede reordenarlas; el orden causal se valida contra el pack. Luego aparecen azules, actores, lilas, rosas, verdes, amarillas, cada capa con su leyenda.
4. **Transformación del término (módulo 4)**: al arrastrar la nota ambigua (p. ej. "Producto") de un lado de la frontera al otro, la nota *cambia de forma*: otros atributos, otro nombre local, otra definición.
5. **Romper invariantes (módulo 7)**: el usuario construye un comando (con sugerencias de ataque tomadas de los `violation` del pack). La nota-comando viaja al agregado y *rebota* contra el muro amarillo; la línea del código se resalta y aparece el mensaje traducido. La animación la ejecuta el intérprete de referencia (instantánea); el botón "ejecutar en {lenguaje}" corre el código real.
6. **Pipeline funcional (módulo 8)**: una entidad-token recorre carriles (`Unvalidated → Validated → Priced → Paid → Placed`); cada etapa cambia su forma (tipo). Un fallo desvía el token a un carril paralelo inferior. El usuario inyecta fallos por etapa.
7. **Antes/después**: control presente en cada concepto; compara la plantilla "ingenua" con la bien diseñada generadas del mismo spec.
8. **Arquitectura (módulo 9)**: intercambias adaptadores (en memoria ↔ SQL ↔ HTTP) y el dominio no cambia; si arrastras una flecha de dependencia del dominio hacia la base de datos, se pone roja.
9. **Evolución (módulo 10)**: una nota nueva vuela al muro, el modelo se parte/crece y se muestra *diff* de muro y de código; el curso cierra regresando al muro completo, ahora en versión 2.

### 1.6 Onboarding

Todo ocurre *sobre el muro*, que empieza en blanco:

1. **Idioma del contenido** — chips con el idioma detectado de `navigator.languages` preseleccionado (editable). La UI cambia al instante.
2. **Lenguaje de programación** — cuatro tarjetas; al pasar el cursor, un mismo `Quantity` (value object) se re-escribe en vivo en TypeScript / Python / Ruby / Ruby+dry-rb. Mensaje implícito: "vas a ver *esto*, adaptado a ti". Precarga en segundo plano el runtime elegido.
3. **Industria** — "Hecho a Mano" (por defecto, destacada), presets, o "describe tu negocio". Al elegir, caen las primeras notas de esa industria sobre el muro.

Todo se puede cambiar después desde la barra superior. Cambiar industria o idioma **conserva el progreso por concepto** (ver §5.5).

### 1.7 El momento de generación (cuando el usuario describe su negocio)

La generación replica el curso: **tres pasadas** (ver §4.6) que llenan el muro en el mismo orden pedagógico.

1. El muro se limpia y una nota con el nombre del negocio queda fijada arriba.
2. **Pasada 1 – Storm**: el LLM transmite JSON parcial; un parser tolerante lo consume y las notas aparecen en cuanto llegan, translúcidas con borde punteado = "pendiente". Eventos naranjas en línea de tiempo, luego comandos, actores, políticas, sistemas, modelos de lectura.
3. **Compuertas** (franja inferior): `Esquema ✓ → Reglas semánticas ✓ → Código ✓` (ver §4.7 sobre qué verifica la tercera). Cada nota pasa de punteada a sólida al validarse. Una regla que falla hace temblar la nota culpable con una etiqueta magenta que explica el porqué.
4. **Pasada 2 – Estrategia**: se dibujan fronteras, se marca el término ambiguo, aparecen relaciones del mapa de contextos.
5. **Pasada 3 – Modelo**: agregados, value objects, workflow, diálogos.
6. **Compuerta de código**: se genera el código y los tests en el lenguaje elegido y se comprueba su sintaxis. Una mini-terminal lista los tests; **cada nota-regla se pone verde cuando su escenario pasa en el intérprete de referencia** (y, si el curso corre embebido en Dojo, cuando el test real pasa en Piston).
7. **Reintento**: las notas fallidas se voltean y caen versiones corregidas ("el taller corrige", intento 2/3).
8. **Fallback**: tras N intentos, el muro se limpia con suavidad, se explica en lenguaje claro qué falló y se ofrece "Hecho a Mano", conservando un reporte descargable.

**Modo simulado** = proveedor que reproduce un pack grabado con cadencia realista *y un fallo inyectable*, para que la demo siempre muestre el reintento.

### 1.8 Modo demo

`?demo=1` (o toggle): oculta controles de desarrollo, aumenta tipografías, resalta el cursor, usa semillas fijas, auto-avanza con la narración y pausas configurables. Compatible con el scrubber para repetir tomas.

---

## 2. El esquema del paquete de dominio

### 2.1 Principios de diseño

1. **Identidad de código ≠ presentación.** Todo concepto tiene `codeName` (inglés, estable, identificador válido) y etiquetas/descripciones por idioma. Los textos largos y mensajes de error van en `LocalizedText`. El código generado usa **solo** `codeName`.
2. **Vocabulario cerrado.** No hay expresiones libres ni código en el pack. Las reglas son un AST pequeño; los efectos, un conjunto fijo; las etapas del workflow, un catálogo fijo. El LLM *selecciona y rellena*, no programa.
3. **Normalizado con referencias por `codeName`.** Listas planas con referencias (fácil de validar y de generar por pasadas). Los conceptos declaran su `context`.
4. **Ejemplos obligatorios.** Cada value object trae ejemplos válidos e inválidos; cada regla trae un escenario de violación. De ahí salen los tests *sin* derivar contraejemplos con un solver.
5. **El esquema se construye desde un registro de idiomas.** `createDomainPackSchema(localeRegistry)`: agregar un idioma agrega la clave obligatoria a todos los `LocalizedText`, sin tocar código del esquema.
6. **Reversibilidad de nombres.** Regla de `codeName`: `PascalCase` para tipos/estados/errores, `camelCase` para campos/parámetros, **sin mayúsculas consecutivas** (`Cfdi`, no `CFDI`). Así la conversión a `snake_case` y de vuelta es exacta, y un código de error de Ruby (`:order_must_have_lines`) vuelve sin ambigüedad a `OrderMustHaveLines` para buscar su mensaje traducido.

### 2.2 Tipos base

```ts
type LocaleCode = "es-MX" | "en"                    // derivado del LocaleRegistry
type LocalizedText = Record<LocaleCode, string>     // todas las claves obligatorias
type TypeName   = Brand<string, "TypeName">         // ^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)*$
type MemberName = Brand<string, "MemberName">       // ^[a-z][a-z0-9]*([A-Z][a-z0-9]*)*$
type Ref<Kind>  = TypeName | MemberName             // referencia por codeName a un concepto de ese tipo

interface Presentable { label: LocalizedText; description: LocalizedText }

type Literal = string | number | boolean | null | Literal[] | { [k: string]: Literal }

type TypeRef =
  | { kind: "primitive"; name: "string" | "integer" | "boolean" | "date" | "timestamp" }
  | { kind: "valueObject"; ref: Ref<"ValueObject"> }
  | { kind: "entity"; ref: Ref<"Entity"> }
  | { kind: "list"; of: TypeRef }
  | { kind: "optional"; of: TypeRef }

interface Field extends Presentable { codeName: MemberName; type: TypeRef }
```

> v1 **no incluye `decimal`**: su semántica difiere entre lenguajes. El dinero se modela como entero en unidades menores (centavos). Es explícito, enseñable y evita sorpresas.

### 2.3 Raíz del paquete

```ts
interface DomainPack {
  schemaVersion: 1
  meta: {
    packId: string                                   // slug
    origin: "handcrafted" | "preset" | "generated"
    locales: LocaleCode[]                            // idiomas con etiquetas completas
    generation?: { model: string; attempts: number; passes: 3 }
  }
  business: { codeName: TypeName; name: LocalizedText; description: LocalizedText }

  // ── Event Storming ──
  experts: Expert[]
  actors: Actor[]
  events: DomainEvent[]
  commands: Command[]
  policies: Policy[]
  externalSystems: ExternalSystem[]
  readModels: ReadModel[]

  // ── Estrategia ──
  contexts: BoundedContext[]
  contextRelations: ContextRelation[]
  ambiguousTerm: AmbiguousTerm
  antiCorruptionLayer: AntiCorruptionLayer

  // ── Táctico ──
  valueObjects: ValueObject[]
  aggregates: Aggregate[]
  workflow: Workflow

  // ── Narrativa y escenarios ──
  dialogues: Record<DialogueSlot, DialogueLine[]>    // slots fijados por la plantilla del curso
  changeScenarios: { businessChange: ChangeScenario; evolution: ChangeScenario }  // 🔶
}
```

🔶 **Añado `dialogues` indexados por *slot* y `changeScenarios`.** Tu lista de contenido del pack no los nombra, pero el módulo 1 ("el mismo cambio de negocio") y el 10 ("llega un requisito nuevo") necesitan datos específicos de la industria, y el temario no puede cambiar. Los *slots* (`ubiquity.intro`, `storming.kickoff`, `contexts.split`, …) son una lista fija definida por el curso; el pack debe llenarlos todos (validación semántica).

### 2.4 Event Storming

```ts
interface Expert extends Presentable { codeName: TypeName; role: LocalizedText; avatarSeed: string }
interface Actor  extends Presentable { codeName: TypeName; kind: "human" | "system" }

interface DomainEvent extends Presentable {
  codeName: TypeName                  // "OrderPlaced"  (label es: "Pedido realizado")
  context: Ref<"BoundedContext">
  sequence: number                    // posición en la línea de tiempo del muro
  payload: Field[]
}

interface Command extends Presentable {
  codeName: TypeName                  // "PlaceOrder"
  context: Ref<"BoundedContext">
  issuedBy: Ref<"Actor"> | { policy: Ref<"Policy"> }     // actor O política: nunca huérfano
  handledBy: Ref<"Aggregate">
  params: Field[]
}

interface Policy extends Presentable {                    // "cuando X, entonces Y"
  codeName: TypeName
  context: Ref<"BoundedContext">
  when: Ref<"DomainEvent">
  then: Ref<"Command">
}

interface ExternalSystem extends Presentable { codeName: TypeName }
interface ReadModel extends Presentable {
  codeName: TypeName; context: Ref<"BoundedContext">
  fields: Field[]; fedBy: Ref<"DomainEvent">[]; usedBy: Ref<"Actor">[]
}
```

### 2.5 Estrategia

```ts
interface BoundedContext extends Presentable {
  codeName: TypeName
  subdomain: { type: "core" | "supporting" | "generic"; rationale: LocalizedText }
}

type ContextRelation =
  | { type: "upstreamDownstream"; upstream: Ref<"BoundedContext">; downstream: Ref<"BoundedContext">
      upstreamRoles: ("OpenHostService" | "PublishedLanguage")[]
      downstreamRoles: ("AntiCorruptionLayer" | "Conformist")[]
      customerSupplier: boolean
      via: Ref<"DomainEvent">[] ; description: LocalizedText }
  | { type: "partnership" | "sharedKernel"; a: Ref<"BoundedContext">; b: Ref<"BoundedContext">
      shared: Ref<"ValueObject">[]; description: LocalizedText }
  | { type: "separateWays"; a: Ref<"BoundedContext">; b: Ref<"BoundedContext">; description: LocalizedText }

interface AmbiguousTerm {
  codeName: TypeName                                        // "Product"
  label: LocalizedText
  meanings: {                                               // ≥ 2 contextos distintos
    context: Ref<"BoundedContext">
    concept: Ref<"Aggregate" | "Entity" | "ValueObject">    // su tipo local, p. ej. Listing, OrderLine, Parcel, TaxableItem
    definition: LocalizedText
    showcaseFields: Ref<"Field">[]                          // qué atributos muestra la nota al transformarse
  }[]
}

interface AntiCorruptionLayer {
  context: Ref<"BoundedContext">
  externalSystem: Ref<"ExternalSystem">
  externalTypes: ExternalType[]                // modelo ajeno
  translation: Mapping[]
}
interface ExternalType extends Presentable {
  codeName: TypeName                           // nombre en nuestro código: TaxInvoiceDocument
  wireName: string                             // nombre real en el sistema ajeno: "cfdi:Comprobante"
  fields: (Field & { wireName: string })[]
}
type Mapping =                                 // vocabulario cerrado
  | { op: "rename";  from: string; to: string }
  | { op: "mapCode"; from: string; to: string; table: Record<string, string> }  // p. ej. método de pago → "PUE"/"PPD"
  | { op: "format";  from: string; to: string; format: "minorUnitsToDecimalString" | "isoDate" | "isoTimestamp" }
  | { op: "constant"; to: string; value: Literal }
```

Nota: el `wireName` conserva la realidad del sistema externo (SAT en español) sin romper la regla "código en inglés": el *tipo* y los campos de nuestro lado usan `codeName` y el `wireName` solo aparece en la tabla de traducción de la capa anticorrupción.

### 2.6 Value objects

```ts
type ValueObject = Presentable & { codeName: TypeName } & (
  | { kind: "scalar"; base: "string" | "integer"; constraints: Constraint[]
      examples: { valid: Literal[] } }
  | { kind: "record"; fields: Field[]; examples: { valid: Literal[] } }
  | { kind: "enum"; members: { codeName: TypeName; label: LocalizedText }[] }
)

interface Constraint {
  kind: "minLength" | "maxLength" | "min" | "max" | "pattern" | "oneOf"
  value: Literal
  errorCode: TypeName                    // p. ej. "QuantityTooSmall"
  message: LocalizedText
  invalidExamples: Literal[]             // valores que deben ser rechazados por *esta* restricción
}
```

### 2.7 Agregados: el mini-DSL

```ts
interface Aggregate extends Presentable {
  codeName: TypeName
  context: Ref<"BoundedContext">
  identity: { codeName: MemberName; valueObject: Ref<"ValueObject"> }
  fields: Field[]
  derived: { codeName: MemberName; type: TypeRef; expr: Expr }[]
  entities: Entity[]                                  // internas al agregado (OrderLine…)
  states: State[]
  initialState: Ref<"State">
  rules: Rule[]                                       // guardas e invariantes comparten forma
  invariants: Ref<"Rule">[]                           // reglas que valen SIEMPRE (se comprueban tras cada transición)
  transitions: Transition[]
}

interface State extends Presentable {
  codeName: TypeName
  terminal: boolean
  data: Field[]                                       // datos que solo existen en este estado (p. ej. Shipped.trackingNumber)
}

interface Transition {
  command: Ref<"Command">
  from: Ref<"State">[]
  to: Ref<"State">
  guards: Ref<"Rule">[]                               // precondiciones, se evalúan en orden
  effects: Effect[]
  emits: Ref<"DomainEvent">[]
}
// Cualquier par (estado, comando) sin transición se rechaza con el error genérico InvalidStateForCommand.

type Effect =
  | { op: "set";    field: Ref<"Field">; value: Expr }
  | { op: "append"; field: Ref<"Field">; value: Expr }

interface Rule extends Presentable {                  // el codeName ES el código de error
  codeName: TypeName                                  // "OrderMustHaveLines"
  predicate: Predicate
  message: LocalizedText                              // lo que ve el usuario en la UI
  violation: Scenario                                 // escenario que debe ser rechazado por esta regla
}

type Expr =
  | { op: "literal"; value: Literal }
  | { op: "field";   path: string }                   // campo del agregado
  | { op: "arg";     name: Ref<"Field"> }             // parámetro del comando
  | { op: "sumOf";   collection: string; term: Expr }
  | { op: "multiply" | "add" | "subtract"; left: Expr; right: Expr }
  | { op: "count";   collection: string }

type Predicate =
  | { kind: "compare";  left: Expr; operator: "==" | "!=" | "<" | "<=" | ">" | ">="; right: Expr }
  | { kind: "present";  path: string }                // un opcional está informado
  | { kind: "notEmpty"; path: string }                // colección no vacía
  | { kind: "all" | "any"; of: Predicate[] }
  | { kind: "not";      of: Predicate }

interface Scenario {
  given: CommandCall[]                                // comandos que llevan al agregado al estado previo
  when: CommandCall                                   // el comando que debe ser rechazado
}
interface CommandCall { command: Ref<"Command">; args: Record<string, Literal> }  // lo omitido se completa con VO.examples.valid
```

Detalles de diseño que conviene explicitar:

- **Guarda vs. invariante**: misma estructura `Rule`, dos posiciones. Una *guarda* (en `transition.guards`) se comprueba antes de la transición con el estado actual y los argumentos; una *invariante* (en `aggregate.invariants`) se comprueba sobre el estado resultante. Evans/Vernon las distinguen; el DSL lo respeta sin duplicar tipos.
- **El estado como datos**: `State.data` permite que `Shipped` lleve `trackingNumber`. En el estilo OO se vuelve campo opcional con guarda; en el estilo funcional se vuelve un tipo distinto (ver §3.5, *perspectiva funcional*).
- **Reglas "codificables en tipos"**: `notEmpty` y `present` se pueden promover a restricciones de tipo en el estilo funcional (`NonEmptyList`, campo obligatorio); `compare` entre campos y argumentos no. Esa clasificación sale automática del `kind` del predicado y alimenta una explicación real del *trade-off*.

### 2.8 Workflow

```ts
interface Workflow extends Presentable {
  codeName: TypeName                                  // "PlaceOrderWorkflow"
  trigger: Ref<"Command">
  intermediateTypes: {                                // un tipo por salida de etapa
    codeName: TypeName                                // UnvalidatedOrder, ValidatedOrder, PricedOrder, PaidOrder
    extends?: Ref<"IntermediateType">                 // hereda campos y agrega los nuevos
    fields: Field[]
  }[]
  stages: Stage[]
  produces: Ref<"DomainEvent">[]
}

interface Stage extends Presentable {
  codeName: TypeName                                  // "ValidateOrder"
  input: Ref<"IntermediateType">
  output: Ref<"IntermediateType">
  kind:                                               // catálogo cerrado, cada uno con plantilla propia
    | { type: "validate" }                            // construye value objects (constructores inteligentes)
    | { type: "compute"; assigns: { field: Ref<"Field">; expr: Expr }[] }
    | { type: "callPort"; port: { codeName: TypeName; operation: MemberName; description: LocalizedText } }
    | { type: "commit" }                              // persiste y publica eventos
  errors: { codeName: TypeName; message: LocalizedText }[]
}
```

### 2.9 Diálogos y escenarios de cambio

```ts
type DialogueSlot = "ubiquity.intro" | "ubiquity.ambiguity" | "storming.kickoff" | "storming.commands"
  | "contexts.split" | "contexts.mapping" | "subdomains.focus" | "tactical.aggregate"
  | "functional.pipeline" | "architecture.ports" | "evolution.request" | "whyDdd.change"  // lista fija; se amplía con el curso

interface DialogueLine { speaker: Ref<"Expert">; text: LocalizedText }   // marcado inline: {{term:Order}}

interface ChangeScenario {
  story: LocalizedText                // el requisito contado por un experto
  patch: PatchOperation[]             // vocabulario cerrado
}
type PatchOperation =
  | { op: "addState" | "addCommand" | "addEvent" | "addRule" | "addTransition"; payload: unknown /* tipado por op */ }
```

### 2.10 Ejemplo: el agregado `Order` de "Hecho a Mano" (abreviado)

```jsonc
{
  "codeName": "Order",
  "label": { "es-MX": "Pedido", "en": "Order" },
  "description": { "es-MX": "Compra de uno o más productos de artesanos a un comprador.", "en": "A buyer's purchase of one or more artisan products." },
  "context": "Ordering",
  "identity": { "codeName": "orderId", "valueObject": "OrderId" },
  "fields": [
    { "codeName": "buyerId", "type": { "kind": "valueObject", "ref": "BuyerId" } },
    { "codeName": "lines", "type": { "kind": "list", "of": { "kind": "entity", "ref": "OrderLine" } } },
    { "codeName": "shippingAddress", "type": { "kind": "optional", "of": { "kind": "valueObject", "ref": "Address" } } }
  ],
  "derived": [{
    "codeName": "total", "type": { "kind": "valueObject", "ref": "Money" },
    "expr": { "op": "sumOf", "collection": "lines", "term": { "op": "field", "path": "subtotal" } }
  }],
  "states": [
    { "codeName": "Draft", "terminal": false, "data": [] },
    { "codeName": "Placed", "terminal": false, "data": [] },
    { "codeName": "Paid", "terminal": false, "data": [] },
    { "codeName": "Shipped", "terminal": false, "data": [{ "codeName": "trackingNumber", "type": { "kind": "valueObject", "ref": "TrackingNumber" } }] },
    { "codeName": "Delivered", "terminal": true, "data": [] },
    { "codeName": "Cancelled", "terminal": true, "data": [] }
  ],
  "initialState": "Draft",
  "rules": [
    {
      "codeName": "OrderMustHaveLines",
      "predicate": { "kind": "notEmpty", "path": "lines" },
      "message": { "es-MX": "Un pedido necesita al menos un producto.", "en": "An order needs at least one product." },
      "violation": { "given": [], "when": { "command": "PlaceOrder", "args": {} } }
    },
    {
      "codeName": "PaymentMustMatchTotal",
      "predicate": { "kind": "compare", "left": { "op": "arg", "name": "amount" }, "operator": "==", "right": { "op": "field", "path": "total" } },
      "message": { "es-MX": "El pago debe ser igual al total del pedido.", "en": "The payment must equal the order total." },
      "violation": {
        "given": [{ "command": "AddLine", "args": {} }, { "command": "SetShippingAddress", "args": {} }, { "command": "PlaceOrder", "args": {} }],
        "when": { "command": "ConfirmPayment", "args": { "amount": 1 } }
      }
    }
  ],
  "transitions": [
    { "command": "PlaceOrder", "from": ["Draft"], "to": "Placed",
      "guards": ["OrderMustHaveLines", "ShippingAddressRequired"], "effects": [], "emits": ["OrderPlaced"] },
    { "command": "ConfirmPayment", "from": ["Placed"], "to": "Paid",
      "guards": ["PaymentMustMatchTotal"], "effects": [], "emits": ["PaymentConfirmed"] },
    { "command": "Ship", "from": ["Paid"], "to": "Shipped",
      "guards": [], "effects": [{ "op": "set", "field": "trackingNumber", "value": { "op": "arg", "name": "trackingNumber" } }],
      "emits": ["OrderShipped"] },
    { "command": "Cancel", "from": ["Draft", "Placed", "Paid"], "to": "Cancelled",
      "guards": [], "effects": [], "emits": ["OrderCancelled"] }
  ],
  "invariants": ["OrderLinesWithinLimit"]
}
```

`Cancel` desde `Shipped` no tiene transición ⇒ se rechaza con `InvalidStateForCommand`: la regla "un pedido enviado no se cancela" queda expresada por la **forma de la máquina de estados**, sin código extra.

---

## 3. De mini-DSL a código idiomático

### 3.1 Pipeline de generación

```
DomainPack ──▶ ViewModel (puro, por lenguaje) ──▶ Plantillas ──▶ { archivos, anclas }
                │                                      ▲
                │ nombres convertidos (convención)      │ descriptor del lenguaje (datos)
                │ tipos mapeados (tabla de tipos)       │ + parciales por construcción
                └─ símbolos reservados verificados      │
DomainPack ──▶ TestPlan (casos independientes del lenguaje) ──▶ plantillas de test ──▶ tests
```

- **Descriptor del lenguaje (datos)**: convención de nombres, palabras reservadas, nombres de librería estándar que colisionan, tabla de tipos, operadores, patrón de acceso a campos, disposición de archivos, harness de tests, comando de ejecución.
- **ViewModel** (TypeScript, puro y testeado): todo lo que las plantillas necesitan *ya resuelto* (nombres convertidos, tipos mapeados, condiciones renderizadas con los operadores del descriptor). Las plantillas casi no tienen lógica.
- **Plantillas**: Handlebars (lógica mínima, obliga a que la lógica viva en el ViewModel, que sí tiene tests). Decisión final en ADR.
- **Anclas**: helper `{{#anchor ref}}…{{/anchor}}`; el renderizador devuelve código limpio + lista de rangos `ref → líneas`. El código que se ejecuta es el limpio.
- **Prelude por lenguaje**: un archivo pequeño generado con `Result` (TS, Python, Ruby plano) y harness de tests con salida JSON uniforme; Ruby+dry-rb usa `dry-monads` en lugar de un `Result` propio.

> Agregar un lenguaje = un descriptor + un directorio de plantillas + un harness de test. Cero cambios al núcleo salvo que aparezca una *construcción nueva* en el DSL.

### 3.2 Dos "estilos" por lenguaje (🔶 decisión de alcance)

Los módulos 7 y 8 contrastan dos formas de modelar el mismo agregado, así que cada lenguaje tiene dos conjuntos de plantillas del mismo spec:

- **`entity`** (Evans / Vernon): una clase raíz con `status` y métodos que devuelven `Result`. Es lo que usa el módulo 7.
- **`functional`** (Wlaschin, etiqueta *perspectiva funcional*): un tipo por estado y funciones de transición. Lo usa el módulo 8.

Más el estilo `naive` (anémico) para "antes/después". Son 3 estilos × 4 lenguajes. Propongo entregar `entity` en los cuatro primero, luego `functional`, luego `naive` (el naive es más corto).

### 3.3 Tabla de mapeo (construcción del DSL → idiom por lenguaje)

| Construcción | TypeScript | Python | Ruby plano | Ruby + dry-rb |
|---|---|---|---|---|
| VO escalar | tipo *branded* + constructor inteligente que devuelve `Result` | `NewType` + función `create` → `Result` | clase con `Data.define` + `self.create` → `Result` | `Types::Strict::Integer.constrained(gteq: 1)` + `.try` |
| VO record | `interface` readonly + `create` | `@dataclass(frozen=True)` | `Data.define` | `Dry::Struct` |
| Enum | unión de literales | `Enum` | módulo con símbolos | `Types::Symbol.enum(...)` |
| Estado (OO) | unión de literales `OrderStatus` | `Enum` | símbolos | `Types::Symbol.enum` |
| Estado (funcional) | unión discriminada, un tipo por estado | `dataclass` por estado + `Union` | una clase por estado | un `Dry::Struct` por estado |
| Comando | método del agregado | método | método | método (+ `Dry::Validation::Contract` para la forma de entrada en el borde) |
| Guarda / invariante | `if (…) return err({ code })` | `if …: return Err(...)` | `return failure(:code) if …` | `return Failure(:code) if …` |
| Evento | interfaz readonly con `type` | `dataclass` | `Data.define` | `Dry::Struct` |
| Error | unión discriminada `OrderError` | `dataclass` por error | símbolos | símbolos en `Failure` |
| Resultado | `Result<T,E>` del prelude | `Ok/Err` del prelude | `Success/Failure` del prelude | `Dry::Monads[:result]` |
| Port de repositorio | `interface` | `Protocol` | módulo con contrato documentado | módulo con contrato documentado |
| Test | Vitest | pytest | Minitest | Minitest |

Pendiente de verificar en un *spike* antes de fijar: disponibilidad de Minitest y de las gemas dry-rb en el Ruby de Piston (ver §4.4), `Data.define` (Ruby ≥ 3.2) en la versión instalada y el comportamiento exacto de `Dry::Struct#to_h`/reconstrucción con structs anidados.

### 3.4 `Order` — TypeScript (estilo `entity`)

*Salida ilustrativa; se verifica en CI con `tsc --strict` y Vitest.*

```ts
// ordering/order.ts  (generated from pack "hecho-a-mano", aggregate Order)
import { err, ok, type Result } from "../shared/result";
import type { OrderEvent } from "./events";
import type { OrderLine } from "./order-line";
import { Money, type Address, type BuyerId, type OrderId, type TrackingNumber } from "./value-objects";

export type OrderStatus = "Draft" | "Placed" | "Paid" | "Shipped" | "Delivered" | "Cancelled";

export type OrderError =
  | { readonly code: "OrderMustHaveLines" }
  | { readonly code: "ShippingAddressRequired" }
  | { readonly code: "PaymentMustMatchTotal" }
  | { readonly code: "OrderLinesWithinLimit" }
  | { readonly code: "InvalidStateForCommand"; readonly command: string; readonly status: OrderStatus };

export interface OrderOutcome {
  readonly order: Order;
  readonly events: readonly OrderEvent[];
}

interface OrderState {
  readonly orderId: OrderId;
  readonly buyerId: BuyerId;
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly shippingAddress?: Address;
  readonly trackingNumber?: TrackingNumber; // data that only exists in state Shipped
}

const MAX_LINES = 20;

export class Order {
  private constructor(private readonly state: OrderState) {}

  static start(orderId: OrderId, buyerId: BuyerId): Order {
    return new Order({ orderId, buyerId, status: "Draft", lines: [] });
  }

  get status(): OrderStatus {
    return this.state.status;
  }

  get total(): Money {
    return Money.sum(this.state.lines.map((line) => line.subtotal));
  }

  placeOrder(): Result<OrderOutcome, OrderError> {
    if (this.state.status !== "Draft") return this.rejectInvalidState("PlaceOrder");
    if (this.state.lines.length === 0) return err({ code: "OrderMustHaveLines" });
    if (this.state.shippingAddress === undefined) return err({ code: "ShippingAddressRequired" });
    return this.transition({ status: "Placed" }, [
      { type: "OrderPlaced", orderId: this.state.orderId, total: this.total },
    ]);
  }

  confirmPayment(amount: Money): Result<OrderOutcome, OrderError> {
    if (this.state.status !== "Placed") return this.rejectInvalidState("ConfirmPayment");
    if (amount !== this.total) return err({ code: "PaymentMustMatchTotal" });
    return this.transition({ status: "Paid" }, [
      { type: "PaymentConfirmed", orderId: this.state.orderId, amount },
    ]);
  }

  // … ship, cancel, confirmDelivery, addLine follow the same template

  private transition(
    changes: Partial<OrderState>,
    events: readonly OrderEvent[],
  ): Result<OrderOutcome, OrderError> {
    const next = new Order({ ...this.state, ...changes });
    if (next.state.lines.length > MAX_LINES) return err({ code: "OrderLinesWithinLimit" });
    return ok({ order: next, events });
  }

  private rejectInvalidState(command: string): Result<never, OrderError> {
    return err({ code: "InvalidStateForCommand", command, status: this.state.status });
  }
}
```

**Fragmento de plantilla** (con ancla) que produjo las guardas:

```hbs
{{#each transition.guards}}
{{#anchor this.anchorRef}}
if ({{{this.failureCondition}}}) return err({ code: "{{this.errorCode}}" });
{{/anchor}}
{{/each}}
```

**Anclas devueltas** (lo que alimenta el zoom y el resaltado):

```json
[
  { "ref": "Order.transition.PlaceOrder", "lines": [48, 57] },
  { "ref": "Order.rule.OrderMustHaveLines", "lines": [50, 50] },
  { "ref": "Order.rule.ShippingAddressRequired", "lines": [51, 51] },
  { "ref": "Order.invariant.OrderLinesWithinLimit", "lines": [74, 74] }
]
```

**Test generado** (uno por regla, a partir de `rule.violation`):

```ts
import { describe, expect, it } from "vitest";
import { Order } from "../src/ordering/order";
import { aBuyerId, anOrderId } from "./fixtures";

describe("Order · PlaceOrder", () => {
  it("is rejected with OrderMustHaveLines when the order has no lines", () => {
    const order = Order.start(anOrderId(), aBuyerId());

    const result = order.placeOrder();

    expect(result).toEqual({ ok: false, error: { code: "OrderMustHaveLines" } });
  });
});
```

### 3.5 `Order` — Ruby con dry-rb (estilo `entity`)

*Ilustrativo; sujeto al spike de §3.3.*

```ruby
# frozen_string_literal: true

# ordering/order.rb  (generated from pack "hecho-a-mano", aggregate Order)
module Ordering
  # Aggregate root. Immutable: every transition returns a new Order inside a Result.
  class Order < Dry::Struct
    include Dry::Monads[:result]

    Status = Types::Strict::Symbol.enum(:draft, :placed, :paid, :shipped, :delivered, :cancelled)
    MAX_LINES = 20

    attribute  :order_id, Types::OrderId
    attribute  :buyer_id, Types::BuyerId
    attribute  :status, Status
    attribute  :lines, Types::Array.of(OrderLine)
    attribute? :shipping_address, Address
    attribute? :tracking_number, Types::TrackingNumber # only meaningful in :shipped

    def self.start(order_id:, buyer_id:)
      new(order_id: order_id, buyer_id: buyer_id, status: :draft, lines: [])
    end

    def total
      lines.sum(&:subtotal)
    end

    def place_order
      return invalid_state(:place_order) unless status == :draft
      return Failure(:order_must_have_lines) if lines.empty?
      return Failure(:shipping_address_required) if shipping_address.nil?

      transition({ status: :placed }, [OrderPlaced.new(order_id: order_id, total: total)])
    end

    def confirm_payment(amount:)
      return invalid_state(:confirm_payment) unless status == :placed
      return Failure(:payment_must_match_total) unless amount == total

      transition({ status: :paid }, [PaymentConfirmed.new(order_id: order_id, amount: amount)])
    end

    # … ship, cancel, confirm_delivery, add_line follow the same template

    private

    def transition(changes, events)
      next_order = self.class.new(to_h.merge(changes))
      return Failure(:order_lines_within_limit) if next_order.lines.size > MAX_LINES

      Success(Outcome.new(order: next_order, events: events))
    end

    def invalid_state(command)
      Failure([:invalid_state_for_command, command, status])
    end
  end
end
```

**Test generado** (mismo `TestPlan`, plantilla Minitest):

```ruby
# frozen_string_literal: true

class OrderPlaceOrderTest < Minitest::Test
  def test_is_rejected_with_order_must_have_lines_when_the_order_has_no_lines
    order = Ordering::Order.start(order_id: Fixtures.order_id, buyer_id: Fixtures.buyer_id)

    assert_equal Dry::Monads::Failure(:order_must_have_lines), order.place_order
  end
end
```

El harness traduce `:order_must_have_lines` → `OrderMustHaveLines` (conversión reversible) para reportar el código de error en JSON uniforme; la UI lo busca en `rule.message` y lo muestra traducido.

### 3.6 *Perspectiva funcional*: la misma regla, otro trade-off

En el estilo `functional`, `OrderMustHaveLines` (un `notEmpty`) se **promueve a tipo**: `PlacedOrder.lines` es `NonEmptyList<OrderLine>`; el estado ilegal "pedido realizado sin líneas" deja de ser representable y el chequeo vive una sola vez en el constructor inteligente `PlacedOrder.from(draft)`. `PaymentMustMatchTotal` (relacional) no se puede promover y sigue como `Result`.

Trade-off que el curso explica sin presentarlo como la única forma correcta: los tipos documentan y eliminan clases de errores, pero multiplican tipos, y en Python/Ruby esos "tipos" son contratos en tiempo de ejecución (`dry-struct`, `dataclass`), no garantías del compilador. Esa diferencia es exactamente lo que cambia entre las variantes de explicación por lenguaje.

### 3.7 Cómo se derivan los ejercicios (sin escribir ejercicios por industria)

Ejercicio estándar: **"implementa la regla"**. El generador produce el código del agregado *sin* el chequeo de una `Rule` (con un hueco marcado) y el usuario lo completa; los tests generados de esa regla validan. Cambia la industria → cambian las reglas y los nombres; el ejercicio y su validador se derivan solos. Otros ejercicios derivados: "agrega la restricción del value object", "agrega una etapa al pipeline", "mueve esta dependencia a un adaptador".

---

## 4. Arquitectura y estructura de carpetas

### 4.1 Reglas de dependencia (hexagonal)

```
ui ──▶ application ──▶ domain
          │  ▲
          ▼  │
        ports ◀── adapters        content (datos) ◀── application
generation (puro) ◀── application      main.tsx = raíz de composición (único lugar que conoce adapters)
```

- `domain/` y `generation/` no importan nada de React, DOM, IndexedDB ni red.
- `ui/` solo consume casos de uso.
- Se aplica con `dependency-cruiser` + `eslint-plugin-import` (`no-cycle`, `no-restricted-paths`) en CI.

### 4.2 Estructura

```
muro/
├─ docs/
│  ├─ adr/                         # 0001-hexagonal-architecture.md, 0002-closed-pack-dsl.md, …
│  ├─ ubiquitous-language.md       # glosario del propio proyecto
│  └─ proposal/
├─ packs/                          # datos: paquetes de dominio curados
│  ├─ hecho-a-mano.json
│  └─ presets/ clinic.json · logistics.json · fintech.json · education.json
├─ src/
│  ├─ domain/
│  │  ├─ shared/                   # Result, Brand, CodeName, LocaleCode, LocalizedText
│  │  ├─ pack/
│  │  │  ├─ schema/                # Zod: createDomainPackSchema(localeRegistry)
│  │  │  ├─ validation/            # reglas semánticas, una por archivo
│  │  │  ├─ interpreter/           # intérprete de referencia del DSL
│  │  │  ├─ naming/                # tokenización y conversión de codeName
│  │  │  └─ migration/             # migraciones de schemaVersion
│  │  ├─ wall/                     # WallState, WallCommand, reducer, escenas
│  │  ├─ course/                   # Syllabus, ModuleId, ConceptId, Exercise
│  │  └─ progress/                 # Progress, ConceptCompletion
│  ├─ generation/
│  │  ├─ languages/
│  │  │  ├─ typescript/            # descriptor.ts · templates/entity|functional|naive/*.hbs · harness/
│  │  │  ├─ python/
│  │  │  ├─ ruby/
│  │  │  └─ ruby-dry/
│  │  ├─ view-model/               # pack → ViewModel por lenguaje
│  │  ├─ rendering/                # motor de plantillas + anclas
│  │  ├─ test-plan/                # pack → TestPlan independiente del lenguaje
│  │  └─ exercises/                # derivación de ejercicios ("implementa la regla")
│  ├─ content/
│  │  ├─ modules/
│  │  │  ├─ 01-why-ddd/            # module.ts · scenes.ts · explanations/*.{locale}[.language].md
│  │  │  ├─ 02-ubiquitous-language/
│  │  │  └─ … 10-evolution/
│  │  └─ locales/
│  │     ├─ es-MX/  ui.json · errors.json · glossary.json
│  │     └─ en/
│  ├─ application/                 # casos de uso
│  │  ├─ StartCourse.ts · SelectIndustry.ts · GenerateDomainPack.ts · ValidateDomainPack.ts
│  │  └─ RunExercise.ts · CompleteConcept.ts · ChangeLanguage.ts · ChangeProgrammingLanguage.ts
│  ├─ ports/
│  │  └─ LlmProvider.ts · CodeRunner.ts · PackRepository.ts · ProgressRepository.ts · HostBridge.ts
│  ├─ adapters/
│  │  ├─ llm/        OpenAiCompatibleProvider.ts · AnthropicProvider.ts · SimulatedProvider.ts
│  │  ├─ runner/     SyntaxCheckRunner.ts · HostRunner.ts
│  │  ├─ storage/    IndexedDbPackRepository.ts · IndexedDbProgressRepository.ts
│  │  └─ host/       PostMessageHostBridge.ts · NoHostBridge.ts
│  ├─ ui/
│  │  ├─ shell/ · onboarding/ · wall/ · code-panel/ · exercises/ · generation/ · theme/
│  └─ main.tsx                     # composición
├─ scripts/                        # generate-and-run.ts · check-translations.ts · validate-packs.ts
├─ e2e/                            # Playwright
└─ .github/workflows/              # ci.yml · deploy-pages.yml
```

Reglas de nombre: el archivo se llama como lo que exporta (`PackRepository.ts` exporta `PackRepository`); un concepto por archivo; sin `utils/` ni `helpers/` genéricos.

### 4.3 Puertos (firmas conceptuales)

- `LlmProvider.generateStructured({ system, user, jsonSchema, onPartialJson?, signal }) → Result<unknown, LlmError>`. Devuelve JSON crudo; **la validación vive en el dominio**.
- `CodeRunner.run(RunRequest) → Result<RunOutcome, RunnerError>`. `RunRequest = { language, files, testEntry, timeoutMs }`.
- **`RunOutcome` es una unión discriminada, no un booleano**, para que la UI nunca afirme un "pasó" que no ocurrió:
  `Executed { tests: TestResult[], stdout, durationMs }` (hecho por Piston) | `SyntaxChecked { diagnostics: SyntaxDiagnostic[] }` (solo sintaxis, tests **no** ejecutados).
- Adaptadores en v1: `SyntaxCheckRunner` (local, sin ejecutar nada) y `HostRunner` (pide la ejecución a la página padre). El adaptador local usa tree-sitter compilado a wasm (gramáticas de TypeScript, Python y Ruby, carga diferida, unos cientos de KB cada una). El `HostRunner` devuelve el formato uniforme de tests que emite el harness de cada lenguaje.
- Los runtimes pesados (Pyodide, ruby.wasm) quedan **fuera de alcance**; el puerto permite agregarlos después sin tocar el dominio.
- `PackRepository`: `findByKey / save / list / delete`. `ProgressRepository`: `load / markConceptCompleted / save preferences`.
- `HostBridge`: `isEmbedded / send / onMessage`. `NoHostBridge` cuando corre standalone.

### 4.4 Protocolo con el host (definido y tipado desde ahora; sin integración con Dojo)

Sobre `postMessage`, con sobre `{ source: "muro", protocol: 1, type, payload }`, lista de orígenes permitidos, `requestId` para correlación y tiempo máximo.

| Dirección | `type` | Payload |
|---|---|---|
| curso → host | `course:ready` | `{ protocolVersion, capabilities: { remoteExecution: boolean } }` |
| curso → host | `course:conceptCompleted` | `{ conceptId, moduleId, programmingLanguage, packId }` |
| curso → host | `course:runRequested` | `{ requestId, language, files, testEntry, timeoutMs }` |
| host → curso | `host:runResult` | `{ requestId, outcome: RunOutcome }` |
| host → curso | `host:setLocale` | `{ locale }` |
| host → curso | `host:setTheme` | `{ mode: "light" \| "dark", tokens?: Partial<ThemeTokens> }` |
| host → curso | `host:init` | `{ locale?, theme?, programmingLanguage?, industry? }` |

**Ejecución real = Dojo + Piston.** Dojo ya corre Piston con Python, TypeScript, Ruby, Go, Rust y SQLite, así que el curso no ejecuta nada por su cuenta. Standalone, los ejercicios se validan por sintaxis y estructura; embebido, el `HostRunner` obtiene los resultados reales de los tests. Pendiente para Ruby+dry-rb: el Ruby estándar de Piston no trae las gemas. Como son Ruby puro, la idea a verificar es enviarlas dentro de cada petición (Piston acepta varios archivos) y ponerlas en el `$LOAD_PATH` desde el harness, sin tocar la imagen de Dojo; ver §8.

### 4.5 CI

Matriz `pack × lenguaje` (default + presets × 4 lenguajes):

1. Validación de esquema y semántica de todos los packs.
2. Generación del código y los tests; **tipado** (`tsc --strict` para TS) y ejecución con la herramienta real (Vitest, pytest, Minitest con bundler + gemas dry-rb).
3. **Prueba diferencial**: el resultado de cada test generado debe coincidir con lo que predice el intérprete de referencia.
4. Pruebas *golden* (snapshots) del código generado del dominio por defecto: los cambios de plantilla se revisan como diffs legibles.
5. Paridad de traducciones (§5.4).
6. Lint (ESLint + Prettier), Vitest del proyecto, build, Playwright sobre el build, despliegue a GitHub Pages en `main`.

### 4.6 Generación del pack: el pipeline del propio proyecto

Dogfooding de Wlaschin: tipos por etapa y errores como valores.

```
GenerationRequest
  → Pass1 Storm (LLM) → PackFragment
  → Pass2 Strategy (LLM, recibe Pass1)
  → Pass3 Model (LLM, recibe Pass1+2)
  → PackCandidate
  → SchemaValidPack          (Zod)                 ── error ▶ ValidationIssue[]
  → SemanticallyValidPack    (reglas §4.7)         ── error ▶ ValidationIssue[]
  → ExecutablePack           (generar + sintaxis)  ── error ▶ ValidationIssue[]
  → ActivePack
```

- **Por qué tres pasadas**: esquemas más pequeños (los modos estrictos de los proveedores limitan uniones y recursión), latencia repartida, mejor streaming para el muro, y cada pasada ve el contexto de la anterior.
- **Reintento**: solo se repite la pasada afectada, con `ValidationIssue[] { code, path, message }` como contexto. Máximo N configurable (por defecto 3). Agotado → fallback al dominio por defecto con explicación.
- **El LLM nunca escribe código ni explicaciones de concepto**: el prompt de sistema define el formato (esquema) y las convenciones (eventos en pasado, `codeName` en inglés sin acrónimos).

**Adaptadores**
- *OpenAI-compatible*: `chat/completions` con `response_format: json_schema` y degradación automática a "JSON mode + esquema en el prompt + reparación" si el servidor (SheLLM/proxy) no lo soporta.
- *Anthropic*: *tool use* forzado con `input_schema` = el JSON Schema; requiere la cabecera de acceso directo desde navegador.
- *Simulado*: reproduce packs grabados con cadencia y fallos configurables.
- La llave vive solo en el navegador del usuario (IndexedDB), nunca se registra ni se envía a otro sitio. Sin backend propio ⇒ el endpoint debe permitir CORS.

### 4.7 Reglas semánticas (lista inicial)

| # | Regla |
|---|---|
| S01 | Todas las referencias resuelven al concepto del tipo correcto |
| S02 | Cada agregado tiene ≥ 1 regla y cada regla tiene un `violation` que el intérprete confirma como rechazado *por esa regla* |
| S03 | Todos los estados son alcanzables desde `initialState`; todo estado no terminal tiene salida |
| S04 | Todo comando se usa en ≥ 1 transición; todo evento lo emite alguna transición o etapa |
| S05 | `ambiguousTerm` aparece en ≥ 2 contextos con conceptos distintos y definiciones distintas |
| S06 | `codeName` válidos (patrón reversible) |
| S07 | **Tabla de símbolos generada** (incluye nombres derivados como `<X>Error`, `<X>Repository`, `<X>Test`): sin colisiones por contexto, tras convertir a la convención de *cada* lenguaje, sin palabras reservadas ni nombres de librería estándar |
| S08 | Etiquetas presentes en todos los idiomas, no vacías, sin marcadores de posición, ICU válido y mismas variables en todos los idiomas |
| S09 | Todo comando tiene actor o política; toda política referencia un evento y un comando de contextos coherentes con el mapa |
| S10 | Mapa de contextos: contextos distintos y ≥ 3 patrones distintos, incluido ACL |
| S11 | ACL: la traducción cubre todos los campos del modelo externo y del tipo de dominio destino |
| S12 | Workflow: `output` de la etapa *n* = `input` de la etapa *n+1*; errores únicos por etapa; `produces` ⊆ eventos emitidos |
| S13 | Value objects: `examples.valid` cumple todas las restricciones; cada `invalidExamples` viola *su* restricción (verificado con el intérprete) |
| S14 | Cada contexto tiene subdominio; hay ≥ 1 *core*; `rationale` presente |
| S15 | Cada `DialogueSlot` está lleno, con `speaker` y términos `{{term:…}}` existentes |
| S16 | Presupuesto de tamaño (p. ej. 8–25 eventos, 2–5 contextos, 1–4 agregados) y longitud máxima de etiquetas para que quepan en las notas |
| S17 | `changeScenarios` aplican limpio (los parches producen un pack que vuelve a pasar S01–S14) |

La tercera compuerta (`ExecutablePack`) genera el código y los tests en el lenguaje elegido y comprueba que parseen (tree-sitter), que no haya colisiones en la tabla de símbolos y que todos los escenarios pasen en el intérprete de referencia. **No ejecuta los tests generados en el navegador.**

Por qué es suficiente: el generador es determinista y su vocabulario es cerrado, así que las plantillas se prueban en CI con ejecución real (Vitest, pytest, Minitest) sobre el dominio por defecto y cada preset en los cuatro lenguajes. Lo que un pack generado puede romper es *específico del pack* (nombres, referencias, reglas), y eso lo cubren S01–S17 más el intérprete. Si el curso corre embebido, `HostRunner` añade la ejecución real de los tests en Piston.

### 4.8 Intérprete de referencia 🔶

Semántica del DSL en TypeScript puro (~pocos cientos de líneas porque el vocabulario es cerrado). Usos: (a) validar S02/S13/S17 sin runtimes pesados, (b) mover las animaciones del muro de forma instantánea, (c) oráculo para la prueba diferencial en CI. Riesgo: dos implementaciones de la misma semántica; se mitiga con (c).

### 4.9 Persistencia

IndexedDB (con `idb`): `packs` (clave = hash), `progress` (clave = `conceptId`), `preferences`, `credentials` (llave LLM). `schemaVersion` por registro + migraciones puras con fixtures; si una migración falla, se descarta la caché del pack y se regenera.

🔶 **Sobre la clave del pack.** Tu spec indica hash de (industria + descripción + idioma + versión). Como el pack ya contiene etiquetas en *todos* los idiomas soportados, incluir el idioma activo haría que cambiar de idioma regenere el pack. Propongo usar el **conjunto de idiomas soportados al generar** en lugar del idioma activo; si más adelante se agrega un idioma, un llamado corto "solo traducir etiquetas" (validado) completa los packs antiguos.

### 4.10 Calidad del código del proyecto (cómo se ve en la práctica)

- `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; ESLint con `no-explicit-any`, `no-boolean-parameter` (vía regla propia/plugin), `no-restricted-syntax` para literales de texto en JSX; Prettier.
- **Tipos que modelan conceptos**: `ConceptId`, `LocaleCode`, `TypeName`, `PackKey` como *branded types* con constructores inteligentes que devuelven `Result` (errores como valores en los bordes); estados como uniones discriminadas (`PackLifecycle = Candidate | SchemaValid | SemanticallyValid | Executable | Active`), nunca `isValid: boolean`.
- Lenguaje ubicuo del proyecto en `docs/ubiquitous-language.md` (`Pack`, `Scene`, `Wall`, `Concept`, `Anchor`, `Gate`…) y usado idénticamente en código, tipos y docs.
- Comentarios solo para el porqué no evidente; decisiones en ADRs cortos.
- Pruebas: Vitest (dominio, validación, generadores, reductor del muro, intérprete) y Playwright (onboarding → módulo → ejercicio; generación simulada con fallo y reintento; cambio de idioma conservando progreso).

---

## 5. Estrategia de traducción

### 5.1 Capas de texto

| Capa | Dónde vive | Forma |
|---|---|---|
| UI | `content/locales/<locale>/ui.json` | claves tipadas, ICU MessageFormat |
| Explicaciones de concepto | `content/modules/*/explanations/<concepto>.<locale>[.<lenguaje>].md` | Markdown; la variante por lenguaje cae al genérico si no existe |
| Glosario del curso | `content/locales/<locale>/glossary.json` | términos de DDD (Aggregate, Invariant…) |
| Texto del dominio | el pack (`LocalizedText`) | etiquetas, descripciones, diálogos, mensajes de reglas |
| Errores genéricos del motor | `locales/<locale>/errors.json` | `InvalidStateForCommand` con parámetros ICU `{command}`, `{status}` |
| Código generado | — | **siempre inglés** (identificadores y comentarios) |

### 5.2 Reglas

- **Prohibido texto visible en componentes** (regla ESLint sobre literales en JSX + prueba de que `ui/` solo usa `t(key)`).
- Claves tipadas: el catálogo `en` es la fuente de tipos; una clave inexistente no compila.
- Convención de claves: `module.concept.element` (p. ej. `tactical.valueObject.intro`).
- Códigos de locale: `es-MX` y `en` (y `LocaleRegistry` es la única fuente de verdad: alimenta el esquema Zod, el selector, la paridad en CI y el andamiaje de nuevos idiomas).
- Fechas, números y monedas con `Intl` según el locale activo.

### 5.3 Agregar un idioma

1. Agregar la entrada al `LocaleRegistry`.
2. `pnpm i18n:scaffold <locale>` crea archivos con el texto fuente y marca `TODO`.
3. CI falla hasta que UI, explicaciones, glosario, errores y **todos los packs curados** estén completos.
4. Packs ya guardados en el navegador: se completan con la pasada "solo traducir" (§4.9).
Cero cambios de código fuera del registro.

### 5.4 Validación automática (CI y al cargar un pack)

- Paridad de claves entre locales (UI, errores, glosario).
- Paridad de archivos de explicación (todo concepto × locale; variantes por lenguaje opcionales pero consistentes).
- Paridad de variables ICU y de marcadores `{{term:…}}` entre locales.
- Packs: S08 (etiquetas completas, no vacías, ICU válido) y S15 (diálogos).
- Detección de texto igual a la fuente en el idioma destino como *advertencia* (posible traducción olvidada).

### 5.5 Progreso entre cambios de industria o idioma

El progreso se indexa por `conceptId` (fijo, definido por el temario), **no** por pack ni por idioma. Cada finalización guarda metadatos (`packId`, lenguaje, locale) solo como historial. El último intento de un ejercicio se guarda por `(exerciseId, packKey, programmingLanguage)`.

---

## 6. Temario

Cada módulo: **objetivo**, conceptos (IDs estables), interacción principal, ejercicio ejecutable y referencias.
Referencias de capítulos de memoria sobre las ediciones habituales: se confirman al redactar el contenido.

| # | Módulo | Objetivo (el estudiante será capaz de…) | Conceptos (`conceptId`) | Interacción | Ejercicio | Referencias |
|---|---|---|---|---|---|---|
| 1 | **Por qué DDD** | explicar por qué el costo de cambiar crece en un modelo anémico y cómo un modelo rico lo contiene | `why.ball-of-mud` · `why.anemic-model` · `why.cost-of-change` · `why.model-driven` | cambio de negocio propagándose (anémico vs. rico) | localizar dónde vive la regla en el modelo anémico y moverla al modelo | Evans cap. 1, 3 · Wlaschin cap. 1 |
| 2 | **Lenguaje ubicuo** | detectar términos ambiguos y acordar un vocabulario único entre experto y código | `lang.ubiquitous-language` · `lang.glossary` · `lang.ambiguity` | glosario que se construye con los diálogos | clasificar frases (término del dominio vs. jerga técnica) y resolver una ambigüedad | Evans cap. 2 · Wlaschin cap. 2 |
| 3 | **Event Storming** | descubrir un dominio ordenando eventos y agregando comandos, actores, políticas, sistemas, modelos de lectura y agregados | `storm.events` · `storm.commands` · `storm.actors` · `storm.policies` · `storm.external-systems` · `storm.read-models` · `storm.aggregates` | notas que caen en línea de tiempo; capas por color | reordenar eventos y asociar comandos/políticas (validado contra el grafo causal del pack) | Brandolini, *Introducing EventStorming* (técnica y colores; referencia adicional a tus fuentes) · Wlaschin cap. 2 · Vernon cap. 2 |
| 4 | **Contextos acotados** | trazar fronteras de contexto y justificar dónde un modelo deja de valer | `context.bounded-context` · `context.term-translation` | frontera que se dibuja; el término ambiguo se transforma al cruzar | asignar notas a contextos y explicar el término ambiguo en cada uno | Evans cap. 14 · Vernon cap. 2 |
| 5 | **Mapa de contextos** | elegir y justificar un patrón de relación entre contextos, incluyendo una capa anticorrupción | `map.context-map` · `map.customer-supplier` · `map.conformist` · `map.anticorruption-layer` · `map.open-host-service` · `map.published-language` · `map.shared-kernel` · `map.partnership` · `map.separate-ways` | relaciones animadas; galería genérica de los 8 patrones + las relaciones del pack | implementar la ACL del sistema externo (traducción de ida y vuelta, validada con tests) | Evans cap. 14 · Vernon cap. 3, 13 |
| 6 | **Subdominios** | clasificar subdominios y decidir dónde invertir esfuerzo | `strategy.core-domain` · `strategy.supporting-subdomain` · `strategy.generic-subdomain` · `strategy.investment` | burbujas arrastrables y presupuesto de esfuerzo (construir / comprar / delegar) | clasificar los contextos del pack y comparar con la clasificación del experto | Evans cap. 15 · Vernon cap. 2 |
| 7 | **Bloques tácticos** | modelar con value objects, entidades y agregados que protegen invariantes, y exponer eventos, repositorios, fábricas y servicios | `tactical.value-object` · `tactical.entity` · `tactical.aggregate` · `tactical.invariant` · `tactical.domain-event` · `tactical.repository` · `tactical.factory` · `tactical.domain-service` · `tactical.application-service` | zoom semántico hasta el código; **romper invariantes**; antes/después | **implementar la regla** (hueco en el agregado) y la restricción de un value object, validado con los tests generados | Evans cap. 5, 6 · Vernon cap. 5–8, 10–12 (reglas de diseño de agregados) · Evans, *DDD Reference* (eventos de dominio) |
| 8 | **Modelado funcional** *(perspectiva funcional)* | expresar el dominio con tipos restringidos, estados como tipos, workflows como pipelines y errores como valores; comparar con el enfoque clásico | `functional.constrained-types` · `functional.states-as-types` · `functional.illegal-states` · `functional.pipeline` · `functional.errors-as-values` | **pipeline** con carril de error; ver reglas promovidas a tipos | agregar una etapa al pipeline / manejar un error en una etapa | Wlaschin cap. 4–7, 9, 10 |
| 9 | **Arquitectura alrededor del dominio** | aislar el dominio con puertos y adaptadores y justificar la regla de dependencia | `architecture.layers` · `architecture.hexagonal` · `architecture.ports-adapters` · `architecture.dependency-rule` | intercambio de adaptadores; dependencia prohibida en rojo | implementar el repositorio en memoria como adaptador y verificar que los tests del dominio no cambian | Evans cap. 4 · Vernon cap. 4 · Wlaschin cap. 3 · Cockburn, *Hexagonal Architecture* (origen del patrón) |
| 10 | **Evolución** | refactorizar hacia una comprensión más profunda cuando llega un requisito nuevo y reconocer conceptos implícitos | `evolution.implicit-concepts` · `evolution.refactoring-toward-insight` · `evolution.breakthrough` | llega el requisito; el muro y el código cambian con *diff* | implementar la nueva transición del `evolution` del pack (tests generados desde el pack parcheado) | Evans cap. 8, 9, 13 · Wlaschin cap. 12 |

**Etiqueta "perspectiva funcional"**: aparece donde el enfoque difiere del clásico (estados como tipos vs. `status` + guardas; `Result` vs. excepciones; constructores inteligentes vs. validación en el agregado; funciones sobre datos vs. repositorios con servicios) y siempre con el trade-off, nunca como "la forma correcta".

**Variantes de explicación por lenguaje** donde el lenguaje cambia la idea: tipos estáticos vs. contratos en tiempo de ejecución, inmutabilidad (`readonly` / `frozen` / `Data.define` / `Dry::Struct`), `Result` (prelude propio vs. `dry-monads`).

**Fuentes**: se explican con palabras propias y se remite a capítulos o conceptos; no se reproduce texto de los libros.

---

## 7. Plan en fases

Orden pensado para atacar primero lo más riesgoso y lo que todo lo demás consume (el contrato y el generador), y llegar pronto a algo grabable.

| Fase | Tamaño | Entregables | Criterio de salida |
|---|---|---|---|
| **1. Fundaciones y contrato** | M | Repo con tooling (TS estricto, ESLint, Prettier, Vitest, Playwright vacío, dependency-cruiser), CI base, ADRs iniciales; esquema Zod del pack, `codeName`/`LocalizedText`/`LocaleRegistry`; reglas semánticas S01–S17; **intérprete de referencia**; pack "Hecho a Mano" completo escrito a mano; paridad i18n; **spikes** (tree-sitter wasm para sintaxis de TS/Python/Ruby; gemas dry-rb enviadas como archivos a un Piston real; streaming JSON y compatibilidad de esquema estricto con OpenAI-compatible y Anthropic). | El pack por defecto valida (esquema + semántica + escenarios por el intérprete); CI verde; informe de spikes con decisión por punto. |
| **2. Motor de generación** | L | Descriptores y plantillas `entity` + tests para TS, luego Python, Ruby y Ruby+dry-rb; anclas; tabla de símbolos; pruebas golden; CI genera y ejecuta el pack por defecto en los 4 lenguajes; prueba diferencial. | Los 4 lenguajes pasan los tests generados del pack por defecto en CI y coinciden con el intérprete. |
| **3. Ejercicios y puerto de ejecución** | S | Puerto `CodeRunner` con `RunOutcome` (`Executed` / `SyntaxChecked`); `SyntaxCheckRunner` con tree-sitter; `RunExercise`; derivación "implementa la regla" con comprobación de estructura (hueco rellenado, sintaxis válida); protocolo `HostBridge` tipado + `HostRunner` probado contra un host simulado (sin integración real con Dojo). | Un ejercicio se entrega y recibe veredicto "sintaxis válida / errores" en los cuatro lenguajes; el `HostRunner` completa un ciclo petición-resultado contra un host de prueba. |
| **4. Muro y lenguaje visual** | L | Reductor `WallState`, notas, fronteras, flechas, cámara, zoom semántico L0–L3, reproductor de escenas con scrubber, tokens de tema y fuentes; galería de desarrollo del muro. | **Primer hito demostrable**: módulo 3 + 4 (Event Storming y contextos) y zoom a código con anclas, grabable. |
| **5. Onboarding, persistencia y módulos 1–6** | L | Onboarding en el muro, IndexedDB (progreso por concepto, preferencias), casos de uso `StartCourse/SelectIndustry/CompleteConcept`, cambio de idioma/industria conservando progreso, contenido ES/EN de los módulos 1–6 con diálogos de Hecho a Mano. | Recorrido completo 1–6 en ES y EN; Playwright de los flujos principales. |
| **6. Módulos 7–10 e interacciones clave** | L | Romper invariantes, pipeline funcional, antes/después (estilos `functional` y `naive`), arquitectura hexagonal interactiva, evolución con *diff*; contenido ES/EN; variantes por lenguaje. | Curso completo con el dominio por defecto en los 4 lenguajes. |
| **7. Packs generados y presets** | L | Puertos/adaptadores LLM (OpenAI-compatible, Anthropic, simulado), generación en 3 pasadas con streaming, `ValidateDomainPack`, reintentos con errores como contexto, fallback, caché por hash, migraciones, **UI de generación sobre el muro**, 3–4 presets revisados. | Un negocio descrito produce un pack activo (o cae al fallback con explicación); presets pasan CI en los 4 lenguajes. |
| **8. Pulido, demo y despliegue** | M | Modo demo, rendimiento (carga diferida de runtimes con progreso en el muro), accesibilidad y `reduced-motion`, tema para embeber, GitHub Pages, documentación y ADRs al día. | Demo grabada de principio a fin sin cortes; auditoría de accesibilidad básica; despliegue estable. |

Tamaños relativos (S < M < L), no calendario: no sé tu disponibilidad. El mayor riesgo de calendario está en las fases 3 y 7.

---

## 8. Riesgos y decisiones que necesito de ti

### Decisiones (🔶 cambian el alcance o el contrato)

1. **`dialogues` por slot y `changeScenarios` en el pack** (§2.3). Necesarios para módulos 1 y 10 sin romper "el temario no cambia". ¿De acuerdo en extender el contenido del pack?
2. **Vocabulario cerrado** (predicados, efectos, etapas, mapeos). Restringe lo que un negocio generado puede expresar, pero es lo que hace posible el código y los tests deterministas. ¿Aceptable para v1?
3. **Tres estilos de plantilla** (`entity`, `functional`, `naive`) por lenguaje, entregados en ese orden (§3.2).
4. **Intérprete de referencia en TS** (§4.8): animaciones instantáneas + oráculo en CI, a cambio de mantener la semántica en dos sitios.
5. **Clave de caché del pack** con el conjunto de idiomas soportados en lugar del idioma activo (§4.9).
6. **Dinero como entero en unidades menores; sin `decimal` en v1** (§2.2).
7. **Brandolini y Cockburn como referencias adicionales** para Event Storming (colores y técnica) y hexagonal: no están entre tus fuentes pero son el origen de ambas ideas. Se citan solo como referencia.

### Riesgos técnicos principales

| Riesgo | Mitigación |
|---|---|
| **Sin ejecución real standalone**: los ejercicios de Python/Ruby/TS solo validan sintaxis y estructura fuera de Dojo | Es una decisión de alcance. La UI rotula el veredicto como "sintaxis válida · los tests se ejecutan en Dojo" (nunca "pasó"); las animaciones clave usan el intérprete de referencia, que sí es semántico |
| **Esquemas estrictos de proveedores** (uniones, recursión) | Tres pasadas con esquemas más pequeños; AST con `kind` discriminado y profundidad acotada; spike en fase 1 |
| **CORS / llave en el navegador** (sin backend) | Documentado; llave solo local; modo simulado para demos |
| **Packs generados de baja calidad** | Compuertas S01–S17 + ejecución real; presets curados; fallback explícito |
| **Piston de Dojo sin gemas dry-rb** (Ruby estándar) | Spike en fase 1: enviar las gemas (Ruby puro) como archivos de la petición y cargarlas desde el harness. Si falla, plan B: paquete de Ruby con gemas en el Piston de Dojo, o dry-rb solo se muestra y se valida en CI |
| **Calidad de traducción de packs curados** | Revisión humana de los presets; CI solo garantiza completitud, no calidad |
| **Anémico ilustrativo percibido como caricatura** | Rotulado como ilustración y construido de forma honesta (misma lógica, solo dispersa) |

### Tecnologías propuestas (a confirmar en ADRs en la fase 1)

React 18+, Vite, TypeScript estricto, Zod (+ conversión a JSON Schema), Motion, roughjs (o generador propio), Handlebars, `idb`, `intl-messageformat`, Vitest, Playwright, dependency-cruiser. Gestor de paquetes: pnpm.

---

*Siguiente paso, tras tu aprobación o ajustes: iniciar la Fase 1 (fundaciones, contrato y spikes).*
