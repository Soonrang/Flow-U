// src/app/admin/page.tsx
import { redirect } from 'next/navigation';

export default function AdminPage() {
  // /admin 접속 시 1순위인 보호소 리스트로 자동 이동
  redirect('/admin/shelters');
}