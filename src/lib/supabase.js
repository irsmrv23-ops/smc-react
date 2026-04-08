import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jqkizoryuozkhoyccbji.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2l6b3J5dW96a2hveWNjYmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjkzODMsImV4cCI6MjA5MTA0NTM4M30.bXn3ZIQwyz7HL5YxmUCy7Qn1a9SQj0iP8p3qz4GllEI'

export const supabase = createClient(supabaseUrl, supabaseKey)