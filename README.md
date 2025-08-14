# Gemini CLI Tomato

このプロジェクトは[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)でブートストラップされた[Next.js](https://nextjs.org)プロジェクトです。

## ✨ 機能

このアプリケーションは、生産性を向上させるために設計された多機能ポモドーロタイマーです。以下の機能が含まれています。

### 画面操作
<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/pomotamamovie_small.gif" width="100%">


### 1. ポモドーロタイマー

このアプリケーションの中核機能です。作業セッション、短い休憩、長い休憩の時間をカスタマイズできます。

<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/timer.png" width="300">

### 2. 統計ページ

詳細な統計で進捗を追跡します。日次、週次、月次の目標を設定し、活動パターンをグラフで確認できます。

<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/status.png" width="300">


### 3. カレンダー表示

月間カレンダーで過去の活動を振り返ることができます。各日に完了したポモドーロの数が表示されます。

<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/calender.png" width="300">

### 4. 週時間カレンダー

ポモドーロセッションを時間単位で可視化する、レスポンシブ対応の週間カレンダーです。画面サイズに応じてレイアウトが変化します。

**PC表示:**

<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/weekcalender.png" width="300">

### 5. ユーザー認証と設定

サインアップとログインで、複数のデバイス間でデータを同期できます。タイマーの時間、自動開始の有無、テーマ（ダーク/ライト）などをカスタマイズ可能です。

<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/settings.png" width="300">


### 6. タスク管理

完了したポモドーロセッションに関連するタスクを記録・管理できます。

*   **タスク入力**: ポモドーロセッションが完了すると、タスク入力モーダルが表示され、そのセッションで取り組んだタスクを記録できます。前回のタスク内容も表示されるため、継続的な作業の記録に便利です。
*   **タスク履歴**: `/tasks` ページでは、日ごと、週ごとのタスク履歴を一覧で確認できます。
*   **タスクの編集・削除**: 記録したタスクは、後から内容を編集したり、不要なタスクを削除したりすることが可能です。

<img src="https://raw.githubusercontent.com/mash-pg/pomodoro-tomato/main/assets/tasks.png" width="300">

### 7. 通知機能

ポモドーロセッションや休憩の終了を通知でお知らせします。

*   **音声通知**: 各セッションの終了時に、異なる効果音で通知します。設定でミュートすることも可能です。
*   **プッシュ通知**: PWA (Progressive Web App) の機能を利用し、ブラウザが閉じている状態や、アプリケーションがバックグラウンドにある状態でもプッシュ通知を受け取ることができます。これにより、作業に集中しながらも、次のアクションを見逃すことがありません。通知の購読は、タイマー画面から簡単に行えます。


## 🔐 ユーザー認証フロー

本アプリケーションはSupabase Authを利用して、安全なユーザー認証を実現しています。

### 新規登録
1.  ユーザーは`/signup`ページでメールアドレスとパスワードを入力します。
2.  `AuthForm`コンポーネントが入力値を受け取り、Supabaseの`signUp`メソッドを呼び出します。
3.  登録が成功すると、Supabaseは確認メールをユーザーに送信します。
4.  同時に、`handle_new_user`トリガーが実行され、`user_settings`と`user_goals`テーブルに新しいユーザー用のデフォルトデータが作成されます。

### ログイン
1.  ユーザーは`/login`ページでメールアドレスとパスワードを入力します。
2.  `AuthForm`コンポーネントがSupabaseの`signInWithPassword`メソッドを呼び出します。
3.  認証が成功すると、セッションが作成され、ユーザーはアプリケーションのメイン機能にアクセスできるようになります。

**注意:** Supabaseのデフォルト設定では、新規登録後にメール認証が必要です。テスト環境では、Supabaseダッシュボードの **Authentication** > **Settings** で **Disable email confirmations** を有効にすることで、このステップを省略できます。

## 🛠️ 技術スタック

*   **フレームワーク**: [Next.js](https://nextjs.org/)
*   **言語**: [TypeScript](https://www.typescriptlang.org/)
*   **スタイリング**: [Tailwind CSS](https://tailwindcss.com/)
*   **UIコンポーネント**: [React Calendar](https://github.com/wojtekmaj/react-calendar)
*   **チャート**: [Recharts](https://recharts.org/)
*   **データベース**: [Supabase](https://supabase.io/)
*   **テスト**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
*   **PWA**: [next-pwa](https://www.npmjs.com/package/next-pwa)
*   **デプロイ**: [Vercel](https://vercel.com/)

## 🚀 Getting Started

まず、開発サーバーを起動します:

```bash
npm run dev
# or
yarn dev
```

ブラウザで[http://localhost:3000](http://localhost:3000)を開いて結果を確認します。

## 📦 セットアップとデプロイ

### 1. Supabase プロジェクトのセットアップ

1.  [Supabase](https://supabase.com/)にサインアップし、新しいプロジェクトを作成します。
2.  プロジェクトのダッシュボードで、**SQL Editor**に移動します。
3.  `sql/schema.sql`と`sql/user_goals.sql`を実行してデータベースをセットアップします。
4.  **Settings** > **API** に移動し、`Project URL`と`anon` `public`キーを控えておきます。

### 2. ローカルでの実行

#### 前提条件
*   [Node.js](https://nodejs.org/) (v18.x or later)
*   [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)

#### インストール
1.  **リポジトリをクローンする**: `git clone https://github.com/your-username/gemini-cli-tomato.git`
2.  **依存関係をインストールする**: `npm install` or `yarn install`
3.  **環境変数を設定する**: `.env.local`ファイルを作成し、Supabaseのキーを設定します。
    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```
4.  **開発サーバーを起動する**: `npm run dev` or `yarn dev`

### 3. Vercel へのデプロイ

1.  リポジトリをGitHubにプッシュします。
2.  [Vercel](https://vercel.com/)でプロジェクトを作成し、リポジトリを連携します。
3.  環境変数にSupabaseのキーを設定してデプロイします。

## 📱 PWA (Progressive Web App)

このアプリケーションはPWAに対応しており、オフラインでの利用や、スマートフォンやPCのホーム画面にインストールしてネイティブアプリのように使用することができます。

本番環境でサイトにアクセスすると、ブラウザのアドレスバーにインストールアイコンが表示されます。

## 🧪 テスト

JestとReact Testing Libraryを使用した単体テスト、コンポーネントテスト、APIテストが含まれています。

*   **テストの種類**:
    *   **単体テスト**: 各関数や小さなロジックの単位が正しく動作するかを検証します。
    *   **コンポーネントテスト**: UIコンポーネントが期待通りにレンダリングされ、ユーザーインタラクションに反応するかを検証します。
    *   **APIテスト**: Next.jsのAPIルートが正しくリクエストを処理し、データベースとの連携が機能するかを検証します。
*   **主要なテスト対象**:
    *   **タイマーロジック**: ポモドーロ、休憩時間のカウントダウン、モード遷移、自動開始機能。
    *   **ユーザー認証**: サインアップ、ログイン、アカウント削除のフロー。
    *   **タスク管理**: タスクの追加、表示、編集、削除。
    *   **通知機能**: プッシュ通知の購読、解除、送信。
    *   **統計とカレンダー**: ポモドーロセッションの集計と表示。
    *   **設定**: ユーザー設定の保存と適用。
*   **テストの実行**:
    *   **すべてのテストを実行**: `npm test`
    *   **ユニット/結合テストのみ実行**: `npm run test:unit`
    *   **画面テストのみ実行**: `npm run e2etests:tests`
    *   **サーバー起動と画面テストを同時に実行**: `npm run test:e2e:with-server`
*   **テストファイル**: テストは`tests/`ディレクトリ内にコンポーネントやAPIごとに配置されています。

## 🎨 スタイルのカスタマイズ

スタイリングにはTailwind CSSを使用しています。`tailwind.config.mjs`ファイルを編集することで、カラーパレット、フォント、ブレークポイントなどのデザインシステムをカスタマイズできます。

## 🤔 トラブルシューティング

*   **Supabaseへの接続エラー**: `.env.local`ファイルのURLとキーが正しいか確認してください。また、Supabaseプロジェクトのステータスが正常であるか確認してください。
*   **ビルドエラー**: 依存関係が正しくインストールされているか確認してください。`node_modules`と`.next`ディレクトリを削除し、`npm install`を再実行すると解決する場合があります。

## 📂 ディレクトリ構成

```
.
├── sql/                # データベーススキーマと初期データ
├── src/                # ソースコード
│   ├── app/            # Next.js App Router
│   ├── components/     # 再利用可能なReactコンポーネント
│   └── lib/            # ヘルパー関数とライブラリ
└── ...
```

## 🗄️ データベースとログ

### スキーマ

このプロジェクトはSupabaseをバックエンドとして使用しています。データベースには以下のテーブルが含まれます。

*   `user_settings`: ユーザーごとのタイマー設定を保存します。
    *   `user_id` (UUID): ユーザーID (主キー、`auth.users`を参照)
    *   `work_minutes` (INT): 作業時間 (デフォルト: 25分)
    *   `short_break_minutes` (INT): 短い休憩時間 (デフォルト: 5分)
    *   `long_break_minutes` (INT): 長い休憩時間 (デフォルト: 15分)
    *   `long_break_interval` (INT): 長い休憩を取るまでの作業セッション数 (デフォルト: 4)
    *   `auto_start_work` (BOOLEAN): 作業セッションの自動開始 (デフォルト: false)
    *   `auto_start_break` (BOOLEAN): 休憩の自動開始 (デフォルト: false)
    *   `mute_notifications` (BOOLEAN): 通知のミュート (デフォルト: false)
    *   `dark_mode` (BOOLEAN): ダークモードの有効化 (デフォルト: true)
    *   `enable_task_tracking` (BOOLEAN): タスク追跡の有効化 (デフォルト: true)

*   `pomodoro_sessions`: 完了したポモドーロセッションの記録を保存します。
    *   `id` (BIGINT): セッションID (主キー、自動生成)
    *   `user_id` (UUID): ユーザーID (`auth.users`を参照)
    *   `created_at` (TIMESTAMPTZ): セッション作成日時 (デフォルト: 現在時刻)
    *   `duration_minutes` (INT): セッションの長さ (分)

*   `user_goals`: ユーザーが設定した日次、週次、月次の目標を保存します。
    *   `user_id` (UUID): ユーザーID (主キー、`auth.users`を参照)
    *   `daily_pomodoros` (INT): 日次ポモドーロ目標 (デフォルト: 8)
    *   `weekly_pomodoros` (INT): 週次ポモドーロ目標 (デフォルト: 40)
    *   `monthly_pomodoros` (INT): 月次ポモドーロ目標 (デフォルト: 160)

*   `tasks`: ユーザーのタスクを保存します。
    *   `id` (BIGSERIAL): タスクID (主キー、自動生成)
    *   `user_id` (UUID): ユーザーID (`auth.users`を参照)
    *   `description` (TEXT): タスクの内容
    *   `created_at` (TIMESTAMPTZ): タスク作成日時 (デフォルト: 現在時刻)

*   `push_subscriptions`: プッシュ通知の購読情報を保存します。
    *   `id` (SERIAL): 購読ID (主キー、自動生成)
    *   `user_id` (UUID): ユーザーID (`auth.users`を参照)
    *   `subscription` (JSONB): プッシュ購読情報 (JSON形式)
    *   `fcm_token` (TEXT): Firebase Cloud Messagingトークン (ユニーク)
    *   `created_at` (TIMESTAMPTZ): 購読作成日時 (デフォルト: 現在時刻)

すべてのテーブルはRow Level Security (RLS) が有効になっており、ユーザーは自身のデータにのみアクセスできます。

### ログの確認

*   **Supabase**: Supabaseダッシュボードの **Logs** > **PostgREST Logs** からAPIリクエストのログを確認できます。データベースに関する問題は **Database** > **Logs** で確認可能です。
*   **Vercel**: Vercelのプロジェクトダッシュボードの **Logs** タブから、リアルタイムのアプリケーションログ（ビルドログ、関数ログなど）を確認できます。

## 🤝 コントリビューション

コントリビューションを歓迎します！Issueの作成やプルリクエストの送信を気軽に行ってください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。
