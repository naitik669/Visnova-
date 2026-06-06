import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [
  { table: 'profiles', columns: 'id,default_currency,has_seen_landing,onboarding_step,onboarded' },
  { table: 'tasks', columns: 'id,status,sort_order,visibility,completed_at' },
  { table: 'notes', columns: 'id,note_type,is_deleted,deleted_at,audio_url,audio_path' },
  { table: 'progress_logs', columns: 'id,visibility,vision_id,task_id,attachments' },
  { table: 'conversation_participants', columns: 'conversation_id,user_id' },
  { table: 'messages', columns: 'id,conversation_id,user_id,content,read_at,deleted_at' },
  { table: 'vision_teams', columns: 'id,vision_id,owner_id' },
  { table: 'store_products', columns: 'id,title,is_active,safety_status,fulfillment_type' },
  { table: 'user_saved_products', columns: 'id,user_id,product_id,status' },
  { table: 'store_events', columns: 'id,product_id,event_type,source_location' },
];

const failures = [];
const warnings = [];

const optionalChecks = [
  { table: 'notes', columns: 'id,note_icon', reason: 'Note icon picker persistence' },
];

for (const check of checks) {
  const { error } = await supabase
    .from(check.table)
    .select(check.columns)
    .limit(1);

  if (error) {
    if (error.code === '42501') {
      warnings.push({
        table: check.table,
        columns: check.columns,
        reason: 'Private table is not inspectable with the publishable anon key; verify with authenticated QA or service-role CI.',
        code: error.code,
        message: error.message,
      });
      continue;
    }
    failures.push({
      table: check.table,
      columns: check.columns,
      code: error.code,
      message: error.message,
    });
  }
}

for (const check of optionalChecks) {
  const { error } = await supabase
    .from(check.table)
    .select(check.columns)
    .limit(1);

  if (error) {
    warnings.push({
      table: check.table,
      columns: check.columns,
      reason: check.reason,
      code: error.code,
      message: error.message,
    });
  }
}

if (failures.length > 0) {
  console.error('VisNova prelaunch schema check failed.');
  for (const failure of failures) {
    console.error(`- ${failure.table}: ${failure.message} (${failure.code || 'no code'})`);
    console.error(`  expected columns: ${failure.columns}`);
  }
  if (warnings.length > 0) {
    console.error('Optional schema warnings:');
    for (const warning of warnings) {
      console.error(`- ${warning.table}: ${warning.message} (${warning.code || 'no code'})`);
      console.error(`  optional for: ${warning.reason}`);
    }
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('VisNova prelaunch schema check passed with optional warnings.');
  for (const warning of warnings) {
    console.warn(`- ${warning.table}: ${warning.message} (${warning.code || 'no code'})`);
    console.warn(`  optional for: ${warning.reason}`);
  }
  process.exit(0);
}

console.log('VisNova prelaunch schema check passed.');
