"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      alert('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
      router.push('/login'); // Redirect to login page after sign up
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-900 text-white">
      <AuthForm isSignUp={true} onSubmit={handleSignUp} loading={loading} error={error} />
      <p className="mt-4 text-gray-400">
        Already have an account? <a href="/login" className="text-blue-500 hover:underline">Login</a>
      </p>
    </div>
  );
}
