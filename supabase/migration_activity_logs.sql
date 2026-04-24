-- ============================================================
-- Table des logs d'activité — Capitole Énergie
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  project        text        NOT NULL DEFAULT 'mint-contrats',
  user_id        text        NOT NULL,
  user_email     text        NOT NULL,
  user_name      text,
  action         text        NOT NULL,
  opportunity_id text,
  segment        text,
  client_name    text,
  filename       text,
  status         text        NOT NULL CHECK (status IN ('success', 'error')),
  error_msg      text,
  duration_ms    integer,
  created_at     timestamptz DEFAULT now() NOT NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_logs_project    ON activity_logs (project);
CREATE INDEX IF NOT EXISTS idx_logs_user_email ON activity_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_status     ON activity_logs (status);

-- RLS : uniquement accessible côté serveur (service role key)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Politique : le service role peut tout faire, les utilisateurs ne voient rien
-- (la clé service role bypass le RLS de toute façon)
CREATE POLICY "service_role_only" ON activity_logs
  FOR ALL
  USING (false);  -- personne ne peut lire/écrire via anon/user key

-- ============================================================
-- Vue pour le futur portail Admin
-- ============================================================
CREATE OR REPLACE VIEW public.logs_summary AS
SELECT
  project,
  user_email,
  user_name,
  COUNT(*)                                          AS total_actions,
  COUNT(*) FILTER (WHERE status = 'success')        AS total_success,
  COUNT(*) FILTER (WHERE status = 'error')          AS total_errors,
  COUNT(*) FILTER (WHERE action = 'generate_contract') AS total_contracts,
  MAX(created_at)                                   AS last_activity,
  ROUND(AVG(duration_ms) FILTER (WHERE status = 'success'))::int AS avg_duration_ms
FROM activity_logs
GROUP BY project, user_email, user_name
ORDER BY last_activity DESC;
