require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Acepta SUPABASE_ANON_KEY (Render) o SUPABASE_KEY (local .env)
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[DB] ERROR CRÍTICO: SUPABASE_URL o SUPABASE_ANON_KEY no están definidas en las variables de entorno.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
