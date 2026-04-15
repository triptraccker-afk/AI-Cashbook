/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = (url: string | undefined, key: string | undefined) => {
  if (!url || !key) return false;
  if (url === 'your_supabase_url' || key === 'your_supabase_anon_key') return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  return true;
};

export const supabase = isConfigured(supabaseUrl, supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('Supabase configuration missing or using placeholders:', {
    url: supabaseUrl ? (supabaseUrl === 'your_supabase_url' ? 'Placeholder' : 'Present') : 'Missing',
    key: supabaseAnonKey ? (supabaseAnonKey === 'your_supabase_anon_key' ? 'Placeholder' : 'Present') : 'Missing'
  });
}
