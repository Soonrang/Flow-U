// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase 클라이언트 인스턴스 생성 (이 객체로 DB 조회를 수행합니다)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)