import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fyruqkugxqcqgghofmhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cnVxa3VneHFjcWdnaG9mbWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxMzI3OSwiZXhwIjoyMDg5Mzg5Mjc5fQ.e5RVoEYXXl7cwm7Ov7JfL5QxehVaIEjbz5gqBa1J1mg";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFunction() {
  console.log("Invoking Edge Function...");
  
  // First get a real contract ID
  const { data: contract } = await supabase.from("contracts").select("id").limit(1).single();
  
  if (!contract) {
    console.log("No contracts found to test with");
    return;
  }
  
  console.log(`Testing with contract_id: ${contract.id}`);
  
  const response = await supabase.functions.invoke("send-email", {
    body: { type: "invite", contract_id: contract.id },
  });
  
  console.log("Response:", JSON.stringify(response, null, 2));
  
  // Let's also do a raw fetch to get the full body text if it's failing
  if (response.error) {
    console.log("Performing raw fetch to get exact error message...");
    const rawResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ type: "invite", contract_id: contract.id })
    });
    
    console.log("Raw status:", rawResponse.status);
    const text = await rawResponse.text();
    console.log("Raw error text:", text);
  }
}

testFunction();
