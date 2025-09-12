import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Supabase configuration
const supabaseUrl = "https://jzwlfulyhucxsjlvzgrl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6d2xmdWx5aHVjeHNqbHZ6Z3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzQxNzIsImV4cCI6MjA3MDUxMDE3Mn0.xF8HX6I_pOwHvYoOH5V2g1L3bbKsgu8prlycOEy1MGc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTrigger() {
  console.log('🔧 Fixing user profile creation trigger...');
  
  try {
    console.log('📄 Creating the fixed trigger function...');
    
    // Execute the updated function directly
    const { data, error } = await supabase.rpc('handle_new_user_fix');
    
    if (error) {
      console.log('⚠️  Function call failed, this is expected. Proceeding with manual SQL execution...');
    }
    
    console.log('✅ Migration approach ready!');
    console.log('🎯 Please execute the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Fix user profile creation trigger');
    console.log('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    console.log('RETURNS trigger AS $$');
    console.log('BEGIN');
    console.log('  INSERT INTO public.profiles (id, created_at, updated_at)');
    console.log('  VALUES (');
    console.log('    NEW.id,');
    console.log('    NOW(),');
    console.log('    NOW()');
    console.log('  );');
    console.log('  RETURN NEW;');
    console.log('END;');
    console.log('$$ LANGUAGE plpgsql SECURITY DEFINER;');
    console.log('');
    console.log('-- Recreate the trigger');
    console.log('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
    console.log('CREATE TRIGGER on_auth_user_created');
    console.log('  AFTER INSERT ON auth.users');
    console.log('  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();');
    console.log('');
    console.log('📝 This will fix the trigger to work with the credits column.');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

fixTrigger();