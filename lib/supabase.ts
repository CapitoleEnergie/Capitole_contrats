import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client avec service role key (server-side uniquement)
export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityLog {
  project:       string
  user_id:       string
  user_email:    string
  user_name:     string
  action:        string
  opportunity_id?: string
  segment?:      string
  client_name?:  string
  filename?:     string
  status:        'success' | 'error'
  error_msg?:    string
  duration_ms?:  number
}

// ── Logger ────────────────────────────────────────────────────────────────────

export async function logActivity(entry: ActivityLog) {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        ...entry,
        project:    entry.project || 'mint-contrats',
        created_at: new Date().toISOString(),
      })

    if (error) {
      // Ne jamais faire planter l'app si le log échoue
      console.error('[log]', error.message)
    }
  } catch (err) {
    console.error('[log]', err)
  }
}
