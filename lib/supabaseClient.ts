
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zrfmncxtdbmblqzvslkg.supabase.co';
const supabaseAnonKey = 'sb_publishable_xESvLlUfDr7OwXFam0-5ew_Y7rm9DjO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);