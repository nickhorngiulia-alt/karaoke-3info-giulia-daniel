// Somente os DAOs importam este cliente. O navegador usa a API Express.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave || url.includes('SEU-PROJETO') || chave.includes('SUBSTITUA')) {
    throw new Error('Preencha SUPABASE_URL e SUPABASE_SECRET_KEY no .env ou no ambiente do servidor');
}
module.exports = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
