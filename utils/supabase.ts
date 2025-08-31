
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL! || "https://ojtyynurhduznvpgeymh.supabase.co",
  process.env.EXPO_PUBLIC_SUPABASE_KEY! || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdHl5bnVyaGR1em52cGdleW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MzE3MTYsImV4cCI6MjA2MzQwNzcxNn0.GTnPDj2faPDzHJ7QU-qlEOl1BC6YznkWrr0Y2Mpgr4k",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })
        