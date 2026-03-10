require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'TU_SUPABASE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
