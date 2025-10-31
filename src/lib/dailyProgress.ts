// src/lib/dailyProgress.ts
import { supabase } from "@/lib/supabaseClient";

export async function getTodayCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date().toISOString().slice(0, 10); // UTC日付
  const { data, error } = await supabase
    .from("daily_progress")
    .select("completed_count")
    .eq("user_id", user.id)
    .eq("day", today)
    .single();

  if (error && error.code !== "PGRST116") { // not found は無視
    console.error(error);
  }
  return data?.completed_count ?? 0;
}

export async function incTodayCount(delta = 1): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10); // UTC
  // UPSERT: なければ作成、あれば加算（0未満防止はクライアント側でもやる）
  const { data: cur } = await supabase
    .from("daily_progress")
    .select("completed_count")
    .eq("user_id", user.id)
    .eq("day", today)
    .single();

  const next = Math.max(0, (cur?.completed_count ?? 0) + Math.max(0, delta));

  const { error } = await supabase
    .from("daily_progress")
    .upsert({ user_id: user.id, day: today, completed_count: next });

  if (error) throw error;
}

// ★ 追加：減算
export async function decTodayCount(delta = 1): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10); // UTC
  const { data: cur } = await supabase
    .from("daily_progress")
    .select("completed_count")
    .eq("user_id", user.id)
    .eq("day", today)
    .single();

  const next = Math.max(0, (cur?.completed_count ?? 0) - Math.max(0, delta));

  const { error } = await supabase
    .from("daily_progress")
    .upsert({ user_id: user.id, day: today, completed_count: next });

  if (error) throw error;
}
