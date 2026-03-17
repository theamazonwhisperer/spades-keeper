import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Log an error to Supabase error_logs table.
 * Safe to call from anywhere — never throws.
 */
export async function logError(
  action: string,
  error: unknown,
  details?: Record<string, unknown>
): Promise<void> {
  const user = useAuthStore.getState().user;
  try {
    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      action,
      error_message: error instanceof Error ? error.message : String(error),
      error_details: details ?? null,
    });
  } catch {
    // Never throw from the error logger
  }
}
