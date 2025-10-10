  -- ============================================================================
  -- SEED: Registrar taller BIO-001 para testing
  -- Fecha: 2025-01-09
  -- Descripción: Registra metadata del taller BIO-001
  -- Nota: El contenido completo se carga desde public/workshops/BIO-001.json
  -- ============================================================================

  -- Registrar taller BIO-001 (solo metadata)
  INSERT INTO public.talleres (
    id,
    owner_teacher_id,
    nombre,
    descripcion,
    contenido_json,
    etiquetas,
    es_publico,
    created_at,
    updated_at
  )
  VALUES (
    'BIO-001',
    NULL, -- Taller oficial sin propietario
    'Célula: El Origen de una Enfermedad Misteriosa',
    'Taller interactivo de Biología sobre estructuras celulares y su relación con enfermedades',
    '{"file": "/workshops/BIO-001.json"}'::jsonb, -- Referencia al archivo estático
    ARRAY['Biología', 'Secundaria', 'Células'],
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    etiquetas = EXCLUDED.etiquetas,
    es_publico = EXCLUDED.es_publico,
    updated_at = NOW();

  -- Verificación
  DO $$
  BEGIN
    RAISE NOTICE 'Taller BIO-001 insertado/actualizado exitosamente';
  END $$;
