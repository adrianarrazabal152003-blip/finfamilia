const SUPABASE_URL = 'https://yshzobskmhuxheerzieu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaHpvYnNrbWh1eGhlZXJ6aWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODIzNzUsImV4cCI6MjA4ODA1ODM3NX0.N0IOynFCTL25LtbmKP48jIadYGFDFEl-IyotKWbxPwY';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
