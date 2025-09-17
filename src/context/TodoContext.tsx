"use client";

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Todo {
  id: number;
  user_id: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
}

interface TodoContextType {
  todos: Todo[];
  fetchTodos: () => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const fetchTodos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching todos:', error);
      } else {
        setTodos(data);
      }
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return (
    <TodoContext.Provider value={{ todos, fetchTodos }}>
      {children}
    </TodoContext.Provider>
  );
};

export const useTodos = () => {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
};
