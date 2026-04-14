import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fyruqkugxqcqgghofmhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cnVxa3VneHFjcWdnaG9mbWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTMyNzksImV4cCI6MjA4OTM4OTI3OX0.TlS_zmSMcAFCdmnLSaKWHXRWRFwDTKq8W8Nl59WpLEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching for client_id...");
  const { data: clientData, error: clientErr } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, title, status, total_amount, deadline')
    .eq('client_id', '25b7cc69-3348-490a-acda-06ee776b77f8');
    
  console.log("Client Data:", clientData);
  console.log("Client Error:", clientErr);

  console.log("\nFetching for freelancer_id...");
  const { data: freeData, error: freeErr } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, title, status, total_amount, deadline')
    .eq('freelancer_id', '25b7cc69-3348-490a-acda-06ee776b77f8');
    
  console.log("Freelancer Data:", freeData);
  console.log("Freelancer Error:", freeErr);
}
run();
