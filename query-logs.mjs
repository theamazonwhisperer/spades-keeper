import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sahwzhbapprswurvtjxt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHd6aGJhcHByc3d1cnZ0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDQ5NDIsImV4cCI6MjA4ODMyMDk0Mn0.3_B52nskPotlV3tb0hM4U5GqGjMX6-eN0AqBsIuqsvA';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
});

// Query error logs from the last 24 hours
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const { data, error } = await supabase
  .from('error_logs')
  .select('*')
  .gte('created_at', yesterday.toISOString())
  .order('created_at', { ascending: false })
  .limit(50);

if (error) {
  console.error('Query error:', error);
} else {
  console.log('Recent error logs:');
  console.log(JSON.stringify(data, null, 2));
}
