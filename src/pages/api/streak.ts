import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * ポモドーロの連続日数を計算し、返すAPIエンドポイント。
 * GETリクエストのみを受け付け、認証されたユーザーのポモドーロセッション履歴に基づいて連続日数を算出します。
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // 1. HTTPメソッドのチェック
  // GET以外のリクエストは許可しない
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Supabaseクライアントの初期化とセッションの取得
    // リクエストとレスポンスオブジェクトを使用して、サーバーサイドでSupabaseクライアントを初期化
    const supabase = createServerSupabaseClient({ req, res });
    // 現在のユーザーセッションを取得
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 3. ユーザー認証の確認
    // セッションが存在しない（ユーザーが認証されていない）場合はエラーを返す
    if (!session) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // 4. ポモドーロセッション履歴の取得
    // データベースから現在のユーザーのポモドーロセッション履歴を全て取得
    // created_at（作成日時）で降順にソートし、最新のセッションから取得する
    const { data: pomodoroSessions, error } = await supabase
      .from('pomodoro_sessions')
      .select('created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    // データベースクエリでエラーが発生した場合は、そのエラーをスローする
    if (error) {
      throw error;
    }

    // デバッグ用ログ: 取得したポモドーロセッションのリストを表示
    // console.log('Fetched pomodoro sessions:', pomodoroSessions);

    // 5. セッション履歴の存在チェック
    // ポモドーロセッションが一つも存在しない場合は、連続日数を0として返す
    if (!pomodoroSessions || pomodoroSessions.length === 0) {
      return res.status(200).json({ streak: 0 });
    }

    // 6. ユニークな日付の抽出
    // 取得したセッション履歴から、日付部分のみを抽出し、重複を排除してユニークな日付のリストを作成
    // これにより、同じ日に複数回ポモドーロを実行しても1日としてカウントされる
    const dates = pomodoroSessions.map((session) =>
      new Date(session.created_at).toDateString()
    );
    const uniqueDates = [...new Set(dates)];

    // 7. 連続日数の計算初期化
    let streak = 0; // 連続日数を格納する変数
    let currentDate = new Date(); // 現在の日付を取得
    currentDate.setHours(0, 0, 0, 0); // 時間情報をリセットし、日付のみを比較できるように正規化

    // 8. 今日のセッションの確認と初期連続日数の設定
    // 今日の日付がユニークな日付リストに含まれているかを確認
    const todayString = currentDate.toDateString();
    if (uniqueDates.includes(todayString)) {
        streak++; // 今日のセッションがあれば連続日数を1増やす
        currentDate.setDate(currentDate.getDate() - 1); // 次のチェックのために日付を1日前に戻す
    } else {
        // 今日のセッションがない場合、昨日のセッションがあるかを確認
        currentDate.setDate(currentDate.getDate() - 1); // 日付を1日前に戻す
        const yesterdayString = currentDate.toDateString();
        // 昨日のセッションもなければ、連続は0日と判断して返す
        if(!uniqueDates.includes(yesterdayString)) {
            return res.status(200).json({ streak: 0 });
        }
    }

    // 9. 過去に遡って連続日数を計算
    // 現在の日付から過去に遡り、ポモドーロセッションが連続している日数をカウントするループ
    let consecutive = true; // 連続が続いているかを示すフラグ
    while(consecutive) {
        const dateString = currentDate.toDateString(); // 現在チェックしている日付の文字列形式
        // デバッグ用ログ: チェックしている日付を表示
        // console.log('Checking dateString:', dateString);

        // 現在チェックしている日付がユニークな日付リストに含まれているかを確認
        if (uniqueDates.includes(dateString)) {
            streak++; // 含まれていれば連続日数を増やす
            currentDate.setDate(currentDate.getDate() - 1); // 次のチェックのために日付を1日前に戻す
        } else {
            consecutive = false; // 含まれていなければ連続が途切れたと判断し、ループを終了
        }
    }

    // 10. 最終的な連続日数の返却
    return res.status(200).json({ streak });
  } catch (error: any) {
    // 11. エラーハンドリング
    // 処理中にエラーが発生した場合は、エラーメッセージをログに出力し、500エラーを返す
    console.error('Error fetching streak data:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default handler;