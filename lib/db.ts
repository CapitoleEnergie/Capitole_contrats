import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityLog {
  project:        string
  user_id:        string
  user_email:     string
  user_name:      string
  action:         string
  opportunity_id?: string
  segment?:       string
  client_name?:   string
  filename?:      string
  status:         'success' | 'error'
  error_msg?:     string
  duration_ms?:   number
}

// ── Logger ────────────────────────────────────────────────────────────────────

export async function logActivity(entry: ActivityLog) {
  try {
    await sql`
      INSERT INTO activity_logs
        (project, user_id, user_email, user_name, action, opportunity_id,
         segment, client_name, filename, status, error_msg, duration_ms, created_at)
      VALUES
        (${entry.project || 'mint-contrats'}, ${entry.user_id}, ${entry.user_email},
         ${entry.user_name}, ${entry.action}, ${entry.opportunity_id ?? null},
         ${entry.segment ?? null}, ${entry.client_name ?? null}, ${entry.filename ?? null},
         ${entry.status}, ${entry.error_msg ?? null}, ${entry.duration_ms ?? null},
         ${new Date().toISOString()})
    `
  } catch (err) {
    console.error('[log]', err)
  }
}
