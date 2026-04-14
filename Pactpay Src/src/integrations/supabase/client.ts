import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fyruqkugxqcqgghofmhi.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cnVxa3VneHFjcWdnaG9mbWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTMyNzksImV4cCI6MjA4OTM4OTI3OX0.TlS_zmSMcAFCdmnLSaKWHXRWRFwDTKq8W8Nl59WpLEA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
