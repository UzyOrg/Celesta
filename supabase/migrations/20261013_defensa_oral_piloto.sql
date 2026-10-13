-- Defensas orales · piloto de 90 días
--
-- Agrega las tablas defensa_*, dos buckets privados (trabajos y audio) y una
-- función para contar los envíos de un enlace de grupo. No cambia ninguna tabla
-- existente: los eventos siguen yendo a eventos_de_aprendizaje.
--
-- Cómo se aplica: pegar completo en el SQL Editor de Supabase y ejecutar. Se puede
-- ejecutar más de una vez sin duplicar nada. NO se ejecuta desde el repositorio.
--
-- Qué queda cerrado: ninguna tabla ni bucket es legible desde el navegador. Se
-- activa RLS sin ninguna política y se retiran los permisos de anon,
-- authenticated y PUBLIC. Solo el servidor (service_role) los toca, y lo hace
-- después de verificar un enlace firmado o la sesión del alumno.
--
-- Qué guarda cada tabla y por cuánto tiempo (ver docs/defensas/backend.md):
--   audio: 7 días después de la defensa (lo borra /api/defensa/mantenimiento)
--   trabajos, transcripciones y toques del profesor: 90 días tras cerrar la cohorte
--   nombre y matrícula: igual que lo anterior
--   perfil (región y accesibilidad): igual, en tabla aparte, nunca va a un modelo

-- ─────────────────────────────────────────────────────────────────────────────
-- Actividades: las configura Hi a mano en la etapa 1.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.defensa_actividades (
  id uuid primary key default gen_random_uuid(),
  -- Código del enlace de grupo: /defensa/<token_grupo>. Aleatorio, no adivinable.
  token_grupo text not null unique check (token_grupo ~ '^[a-z0-9-]{8,48}$'),
  nombre text not null check (char_length(nombre) between 1 and 200),
  curso text not null default '' check (char_length(curso) <= 200),
  grupo text not null default '' check (char_length(grupo) <= 60),
  profesor_nombre text not null check (char_length(profesor_nombre) between 1 and 200),
  -- Identificador libre para agrupar las actividades de un mismo profesor.
  profesor_ref text check (profesor_ref is null or char_length(profesor_ref) <= 120),
  consigna text not null check (char_length(consigna) between 1 and 20000),
  rubrica text check (rubrica is null or char_length(rubrica) <= 20000),
  ejemplos_docente text check (ejemplos_docente is null or char_length(ejemplos_docente) <= 20000),
  contexto_curso text check (contexto_curso is null or char_length(contexto_curso) <= 2000),
  registro text not null default 'tu' check (registro in ('tu', 'usted')),
  -- [{ "id": "O1", "text": "..." }], máximo tres.
  objetivos jsonb not null check (
    jsonb_typeof(objetivos) = 'array' and jsonb_array_length(objetivos) between 1 and 3
  ),
  duracion text not null default 'corta' check (duracion in ('corta', 'larga')),
  fecha_limite timestamptz not null,
  -- Límite de envíos del enlace: cada entrega (también cada nueva versión) cuenta uno.
  limite_envios integer not null default 120 check (limite_envios > 0),
  envios_usados integer not null default 0 check (envios_usados >= 0),
  -- Desactivar el enlace impide entrar y entregar; quien ya está defendiendo puede terminar.
  enlace_activo boolean not null default true,
  -- Subirla invalida todos los enlaces firmados del profesor emitidos antes.
  acceso_version integer not null default 1 check (acceso_version > 0),
  cohorte_cerrada_en timestamptz,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Alumnos, consentimientos y perfil opcional
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.defensa_alumnos (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references public.defensa_actividades (id) on delete cascade,
  matricula text not null check (char_length(matricula) between 1 and 40),
  nombre text not null check (char_length(nombre) between 1 and 200),
  -- Última modalidad elegida; el alumno puede cambiarla en cualquier pregunta.
  modo_preferido text check (modo_preferido in ('voz', 'escrito')),
  dispositivo text check (dispositivo in ('android', 'ios', 'escritorio', 'otro')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (actividad_id, matricula)
);

create table if not exists public.defensa_consentimientos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.defensa_alumnos (id) on delete cascade,
  tipo text not null check (tipo in ('aviso_privacidad', 'transferencia_internacional', 'mayor_de_edad')),
  version_aviso text not null check (char_length(version_aviso) <= 40),
  aceptado boolean not null,
  aceptado_en timestamptz not null default now(),
  unique (alumno_id, tipo, version_aviso)
);

-- Región y accesibilidad, opcionales. Tabla aparte: nunca se envía a un modelo.
create table if not exists public.defensa_perfiles (
  alumno_id uuid primary key references public.defensa_alumnos (id) on delete cascade,
  region text check (region is null or char_length(region) <= 80),
  accesibilidad text[] not null default '{}',
  actualizado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Entregas (con versiones y hora) y planes de preguntas
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.defensa_entregas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.defensa_alumnos (id) on delete cascade,
  actividad_id uuid not null references public.defensa_actividades (id) on delete cascade,
  version integer not null check (version > 0),
  tipo text not null check (tipo in ('archivo', 'texto')),
  nombre_archivo text not null check (char_length(nombre_archivo) <= 255),
  mime text not null check (char_length(mime) <= 120),
  bytes integer not null check (bytes >= 0),
  paginas integer check (paginas is null or paginas >= 0),
  palabras integer check (palabras is null or palabras >= 0),
  ruta_original text not null check (char_length(ruta_original) <= 400),
  -- pendiente: el archivo aún no llega; lista: ya tiene texto; sin_texto: p. ej. un
  -- escaneo, se pide otro archivo; rechazada: formato o tamaño no aceptados; error: falla nuestra.
  estado text not null default 'pendiente' check (estado in ('pendiente', 'lista', 'sin_texto', 'rechazada', 'error')),
  motivo text check (motivo is null or char_length(motivo) <= 120),
  texto_extraido text,
  hash_sha256 text check (hash_sha256 is null or char_length(hash_sha256) = 64),
  tardia boolean not null default false,
  -- Hora de entrega: cuenta desde que el trabajo llega, aunque la defensa falle.
  creada_en timestamptz not null default now(),
  lista_en timestamptz,
  unique (alumno_id, version)
);

create table if not exists public.defensa_planes (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null unique references public.defensa_entregas (id) on delete cascade,
  estado text not null default 'generando' check (
    estado in ('generando', 'listo', 'no_corresponde', 'error')
  ),
  prompt_version text not null,
  proveedor text,
  modelo text,
  -- Plan validado (preguntas, evidencia, anclas). NUNCA sale del servidor.
  plan jsonb,
  problemas jsonb not null default '[]'::jsonb,
  -- Objetivos que se quedaron sin pregunta válida: el reporte dirá "sin evidencia suficiente".
  objetivos_sin_evidencia text[] not null default '{}',
  -- hash del texto -> ruta del audio de la pregunta en el bucket de audio.
  audios jsonb not null default '{}'::jsonb,
  intentos integer not null default 0,
  creado_en timestamptz not null default now(),
  listo_en timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Defensas y turnos (con sus aclaraciones)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.defensa_defensas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.defensa_alumnos (id) on delete cascade,
  actividad_id uuid not null references public.defensa_actividades (id) on delete cascade,
  entrega_id uuid not null references public.defensa_entregas (id) on delete cascade,
  plan_id uuid not null references public.defensa_planes (id) on delete cascade,
  -- La práctica es privada y sin nota: el profesor no la ve.
  es_ensayo boolean not null default false,
  estado text not null default 'en_curso' check (
    estado in ('en_curso', 'por_revisar', 'entregada', 'abandonada', 'incompleta')
  ),
  -- Semilla guardada: con ella el motor de turnos repite exactamente las mismas elecciones.
  semilla integer not null,
  duracion text not null check (duracion in ('corta', 'larga')),
  dispositivo text check (dispositivo in ('android', 'ios', 'escritorio', 'otro')),
  tardia boolean not null default false,
  iniciada_en timestamptz not null default now(),
  terminada_en timestamptz,
  entregada_en timestamptz,
  -- Reloj activo de la defensa (sin las pausas de aclaración).
  duracion_activa_ms integer not null default 0 check (duracion_activa_ms >= 0),
  aclaracion_ms integer not null default 0 check (aclaracion_ms >= 0),
  -- Líneas que el alumno marcó con "No lo dije así": [{ "turno_id": "...", "linea": "..." }].
  marcas_revision jsonb not null default '[]'::jsonb,
  -- Cuánto estrés dio comparado con un examen escrito: 0 (mucho menos) a 4 (mucho más).
  nivel_estres smallint check (nivel_estres between 0 and 4),
  estres_en timestamptz,
  audio_borrado_en timestamptz
);

-- Una sola defensa y un solo ensayo en curso por alumno.
create unique index if not exists defensa_defensas_una_en_curso
  on public.defensa_defensas (alumno_id, es_ensayo)
  where estado = 'en_curso';

create table if not exists public.defensa_turnos (
  id uuid primary key default gen_random_uuid(),
  defensa_id uuid not null references public.defensa_defensas (id) on delete cascade,
  numero integer not null check (numero > 0),
  tipo text not null check (tipo in ('apertura', 'candidata', 'seguimiento', 'transferencia')),
  -- Referencia dentro del plan: "apertura", "O1-a", "O1-a:vaga", "T1".
  pregunta_ref text not null,
  objetivo_id text,
  contexto_texto text not null default '',
  pregunta_texto text not null,
  audio_pregunta_ruta text,
  estado text not null default 'esperando' check (
    estado in ('esperando', 'procesando', 'aclarando', 'cerrado')
  ),
  modo_respuesta text check (modo_respuesta in ('voz', 'escrito')),
  -- Lo que el alumno dijo o escribió, ya con la aclaración aplicada.
  texto_respuesta text,
  -- Palabras de la transcripción con confianza y tiempo: [{ "t": "...", "i": ms, "f": ms, "c": 0..1 }].
  transcripcion jsonb,
  clase text check (clase in ('solida', 'vaga', 'fuera_de_tema', 'sin_respuesta')),
  clase_fuente text check (clase_fuente in ('modelo', 'regla')),
  audio_ruta text,
  audio_mime text,
  duracion_audio_ms integer check (duracion_audio_ms is null or duracion_audio_ms >= 0),
  duracion_respuesta_ms integer check (duracion_respuesta_ms is null or duracion_respuesta_ms >= 0),
  silencios integer not null default 0 check (silencios >= 0),
  repeticiones integer not null default 0 check (repeticiones >= 0),
  -- { "estado": "pendiente|aclarada|no_entendido", "inicio_ms", "fin_ms", "antes", "despues",
  --   "indice_inicio", "indice_fin", "modo", "texto", "duracion_ms" }
  aclaracion jsonb,
  preguntado_en timestamptz not null default now(),
  respondido_en timestamptz,
  unique (defensa_id, numero)
);

create table if not exists public.defensa_audio_partes (
  turno_id uuid not null references public.defensa_turnos (id) on delete cascade,
  indice integer not null check (indice >= 0),
  ruta text not null,
  bytes integer not null check (bytes >= 0),
  creada_en timestamptz not null default now(),
  primary key (turno_id, indice)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reportes, toques del profesor y tiempos de revisión
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.defensa_reportes (
  id uuid primary key default gen_random_uuid(),
  defensa_id uuid not null unique references public.defensa_defensas (id) on delete cascade,
  estado text not null default 'generando' check (estado in ('generando', 'listo', 'error')),
  prompt_version text not null,
  proveedor text,
  modelo text,
  -- Reporte con las citas ya verificadas contra la transcripción.
  reporte jsonb,
  citas_descartadas integer not null default 0 check (citas_descartadas >= 0),
  creado_en timestamptz not null default now()
);

-- Los dos toques del profesor por reporte: "antes" (¿domina el tema?) y "despues" (¿coincide?).
create table if not exists public.defensa_toques_profesor (
  id uuid primary key default gen_random_uuid(),
  defensa_id uuid not null references public.defensa_defensas (id) on delete cascade,
  tipo text not null check (tipo in ('antes', 'despues')),
  valor text not null check (valor in ('si', 'parte', 'no', 'no_se')),
  creado_en timestamptz not null default now(),
  unique (defensa_id, tipo)
);

create table if not exists public.defensa_tiempos_revision (
  id uuid primary key default gen_random_uuid(),
  defensa_id uuid not null references public.defensa_defensas (id) on delete cascade,
  abierto_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Tiempo con el reporte visible y en uso, medido por el navegador.
  activo_ms integer not null default 0 check (activo_ms >= 0)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists defensa_alumnos_actividad on public.defensa_alumnos (actividad_id);
create index if not exists defensa_entregas_alumno on public.defensa_entregas (alumno_id, version desc);
create index if not exists defensa_entregas_actividad on public.defensa_entregas (actividad_id, creada_en);
create index if not exists defensa_defensas_alumno on public.defensa_defensas (alumno_id, es_ensayo, iniciada_en desc);
create index if not exists defensa_defensas_actividad on public.defensa_defensas (actividad_id, es_ensayo, estado);
create index if not exists defensa_defensas_audio on public.defensa_defensas (terminada_en)
  where audio_borrado_en is null;
create index if not exists defensa_turnos_defensa on public.defensa_turnos (defensa_id, numero);
create index if not exists defensa_tiempos_defensa on public.defensa_tiempos_revision (defensa_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Límite de envíos del enlace de grupo
-- ─────────────────────────────────────────────────────────────────────────────

-- Cuenta un envío de forma atómica: si el enlace está desactivado o llegó al
-- límite no cuenta nada y devuelve false. Dos entregas simultáneas no pueden
-- pasarse del tope.
create or replace function public.defensa_reservar_envio(p_actividad uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  filas integer;
begin
  update public.defensa_actividades
     set envios_usados = envios_usados + 1,
         actualizada_en = now()
   where id = p_actividad
     and enlace_activo
     and envios_usados < limite_envios;
  get diagnostics filas = row_count;
  return filas = 1;
end
$$;

-- Devuelve un envío cuando la entrega no llegó a nada (por ejemplo, un escaneo sin texto).
create or replace function public.defensa_liberar_envio(p_actividad uuid)
returns void
language sql
set search_path = public
as $$
  update public.defensa_actividades
     set envios_usados = greatest(envios_usados - 1, 0),
         actualizada_en = now()
   where id = p_actividad;
$$;

revoke all on function public.defensa_reservar_envio(uuid) from public, anon, authenticated;
revoke all on function public.defensa_liberar_envio(uuid) from public, anon, authenticated;
grant execute on function public.defensa_reservar_envio(uuid) to service_role;
grant execute on function public.defensa_liberar_envio(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS cerrada al navegador
-- ─────────────────────────────────────────────────────────────────────────────

do $cierre$
declare
  tabla text;
begin
  foreach tabla in array array[
    'defensa_actividades',
    'defensa_alumnos',
    'defensa_consentimientos',
    'defensa_perfiles',
    'defensa_entregas',
    'defensa_planes',
    'defensa_defensas',
    'defensa_turnos',
    'defensa_audio_partes',
    'defensa_reportes',
    'defensa_toques_profesor',
    'defensa_tiempos_revision'
  ]
  loop
    execute format('alter table public.%I enable row level security', tabla);
    -- Supabase concede por defecto permisos a anon y authenticated en tablas nuevas.
    execute format('revoke all privileges on table public.%I from anon, authenticated, public', tabla);
    execute format('grant all privileges on table public.%I to service_role', tabla);
  end loop;
end
$cierre$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Buckets privados: trabajos y audio
-- ─────────────────────────────────────────────────────────────────────────────

-- Sin políticas sobre storage.objects: el navegador no lee ni escribe nada por su
-- cuenta. Las subidas usan enlaces firmados que emite el servidor y caducan, y las
-- descargas también.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'defensa-trabajos',
    'defensa-trabajos',
    false,
    20971520,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  ),
  (
    'defensa-audio',
    'defensa-audio',
    false,
    10485760,
    array[
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'application/octet-stream'
    ]
  )
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reversa (solo si hay que deshacerlo; borra los datos de las defensas):
--
--   drop table if exists public.defensa_tiempos_revision, public.defensa_toques_profesor,
--     public.defensa_reportes, public.defensa_audio_partes, public.defensa_turnos,
--     public.defensa_defensas, public.defensa_planes, public.defensa_entregas,
--     public.defensa_perfiles, public.defensa_consentimientos, public.defensa_alumnos,
--     public.defensa_actividades cascade;
--   drop function if exists public.defensa_reservar_envio(uuid);
--   drop function if exists public.defensa_liberar_envio(uuid);
--   -- Los buckets se vacían y se borran desde el panel de Storage.
-- ─────────────────────────────────────────────────────────────────────────────
