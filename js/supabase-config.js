// Substitua pelos dados do SEU projeto Supabase
const SUPABASE_URL = "https://wjfpxzbusmnrtlyixtes.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZnB4emJ1c21ucnRseWl4dGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQyOTksImV4cCI6MjEwNTU4MDI5OX0.0I7tUWdkrWjz76RXwGFbgK0Udv0DmSPRGT3VyVc6Ofo";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/upload-legislacao`;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);