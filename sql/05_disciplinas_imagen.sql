-- Permite que Admin > Disciplinas cambie la foto de cada disciplina en el landing
-- (antes estaba fija en el código, en client/src/lib/disciplineTheme.js).

ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS imagen_url TEXT;
