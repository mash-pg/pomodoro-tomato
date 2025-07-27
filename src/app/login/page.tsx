"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/'); // Redirect to home page on successful login
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-900 text-white">
      <AuthForm isSignUp={false} onSubmit={handleLogin} loading={loading} error={error} />
      <p className="mt-4 text-gray-400">
        Don't have an account? <a href="/signup" className="text-blue-500 hover:underline">Sign Up</a>
      </p>
    </div>
  );
}
