import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sahwzhbapprswurvtjxt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHd6aGJhcHByc3d1cnZ0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDQ5NDIsImV4cCI6MjA4ODMyMDk0Mn0.3_B52nskPotlV3tb0hM4U5GqGjMX6-eN0AqBsIuqsvA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
});
