"use client";

import { useState } from 'react';

interface AuthFormProps {
  isSignUp: boolean;
  onSubmit: (email: string, password: string) => void;
  loading: boolean;
  error: string | null;
}

export default function AuthForm({
  isSignUp,
  onSubmit,
  loading,
  error,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isSignUp ? '新規登録' : 'ログイン'}
      </h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
          メールアドレス
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div className="mb-6">
        <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
          パスワード
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
        disabled={loading}
      >
        {loading ? '処理中...' : (isSignUp ? '新規登録' : 'ログイン')}
      </button>
    </form>
  );
}