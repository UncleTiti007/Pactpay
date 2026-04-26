import { supabase } from "./src/integrations/supabase/client";

async function checkNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .limit(10);
    
  if (error) {
    console.error("Error fetching notifications:", error);
    return;
  }
  
  console.log("Notifications sample:", data);
}

checkNotifications();
