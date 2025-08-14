import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as fs from 'fs';

// jestのタイムアウトを60秒に設定
jest.setTimeout(60000);

describe('Full User Flow: Delete -> Register -> Login', () => {
  let driver: WebDriver;

  // スクリーンショットを保存するヘルパー関数
  async function takeScreenshot(filename: string) {
    const screenshotPath = `./testimage/${filename}`;
    const screenshot = await driver.takeScreenshot();
    if (!fs.existsSync('./testimage')) {
      fs.mkdirSync('./testimage');
    }
    fs.writeFileSync(screenshotPath, screenshot, 'base64');
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('should complete the full flow: delete existing account, register new, then login', async () => {
    const deleteEmail = process.env.TEST_DELETE_EMAIL;
    const deletePassword = process.env.TEST_DELETE_PASSWORD;
    const registerPrefix = process.env.TEST_REGISTER_PREFIX || 'test_user_';
    const newEmail = `${registerPrefix}${Date.now()}@example.com`;
    const newPassword = 'new_secure_password'; // 新規登録用パスワード

    if (!deleteEmail || !deletePassword) {
      throw new Error('TEST_DELETE_EMAIL and TEST_DELETE_PASSWORD must be defined in .env.local');
    }

    // --- 1. 退会処理 --- 
    console.log('Starting Account Deletion...');
    // 既存ユーザーでログイン
    await driver.get('http://localhost:3000/login');
    await driver.wait(until.elementLocated(By.id('email')), 10000).sendKeys(deleteEmail);
    await driver.findElement(By.id('password')).sendKeys(deletePassword);
    await driver.findElement(By.css('button[type="submit"]')).click();
    await driver.wait(until.urlIs('http://localhost:3000/'), 10000); // ログイン後のリダイレクトを待機

    // ハンバーガーメニューを開く
        const hamburgerMenuButton = await driver.findElement(By.xpath('//button[contains(@class, "text-white")]')); // 提供されたクラス名を使用
    await hamburgerMenuButton.click();

    // 退会ボタンをクリック
    // 提供されたクラス名を使用
    const deleteAccountButton = await driver.findElement(By.xpath('//button[contains(@class, "block w-full text-red-400 hover:bg-red-700 hover:text-white py-2 px-4 rounded transition-colors duration-200 mt-16 text-left")]'));
    await driver.wait(until.elementIsVisible(deleteAccountButton), 10000); // 要素が可視になるまで待機
    await deleteAccountButton.click();

    // 確認ダイアログの処理 (ネイティブアラートの場合)
    // ★要修正: アプリケーションの確認ダイアログの形式に合わせて修正
    try {
      await driver.wait(until.alertIsPresent(), 5000); // アラートが表示されるまで待機
      const alert = await driver.switchTo().alert();
      console.log('Alert text:', await alert.getText());
      await alert.accept(); // アラートを承認
    } catch (e) {
      console.log('No native alert found, checking for custom modal...');
      // カスタムモーダルの場合、確認ボタンを探してクリック
      // 例: await driver.findElement(By.css('button.confirm-delete')).click();
    }

    // 退会後のリダイレクトを待機 (サインアップページに戻る)
    await driver.wait(until.urlIs('http://localhost:3000/signup'), 10000); // 退会後のリダイレクト先
    await takeScreenshot('delete_account.png');
    console.log('Account Deletion Completed.');

    // --- 2. 新規登録 --- 
    console.log('Starting New Registration...');
    await driver.get('http://localhost:3000/signup'); // ★要修正: 新規登録ページへのパス
    await driver.wait(until.elementLocated(By.id('email')), 10000).sendKeys(newEmail);
    await driver.findElement(By.id('password')).sendKeys(newPassword);
    // ★要修正: 新規登録フォームに他のフィールドがあれば追加
    await driver.findElement(By.css('button[type="submit"]')).click();

    // 新規登録後のリダイレクトを待機 (例: ルートページまたはダッシュボード)
    // ★要修正: ここでメール認証の処理が入ります。
    // 実際のメール認証では、使い捨てメールサービスからメールを取得し、
    // その中の認証リンクにアクセスする処理が必要です。
    // 今回はシミュレーションとして、認証後のページに直接アクセスします。
    await driver.get('http://localhost:3000/login'); // ★要修正: メール認証後のリダイレクト先URL
    await driver.wait(until.urlIs('http://localhost:3000/'), 10000); // ★要修正: 認証後の最終的なリダイレクト先
    await takeScreenshot('new_registration.png');
    console.log('New Registration Completed.');

    // --- 3. ログイン (新規登録したユーザーで) --- 
    console.log('Starting Login with New User...');
    // ログアウト状態を確認または強制的にログインページへ
    await driver.get('http://localhost:3000/login');
    await driver.wait(until.elementLocated(By.id('email')), 10000).sendKeys(newEmail);
    await driver.findElement(By.id('password')).sendKeys(newPassword);
    await driver.findElement(By.css('button[type="submit"]')).click();

    // ログイン後のリダイレクトを待機
    await driver.wait(until.urlIs('http://localhost:3000/'), 10000); // ★要修正: ログイン後のリダイレクト先
    await takeScreenshot('login_success.png');
    console.log('Login with New User Completed.');

    // 最終アサート (例: ログイン後のページに特定の要素があるか)
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toEqual('http://localhost:3000/');

    // --- 4. ログアウト --- 
    console.log('Starting Logout...');
    // ログアウトボタンをクリック
    // ★要修正: ログアウトボタンのセレクタ
    const logoutButton = await driver.findElement(By.xpath('//button[contains(text(), "ログアウト")]')); // または 'Logout'
    await logoutButton.click();

    // ログアウト後のリダイレクトを待機 (例: ログインページに戻る)
    await driver.wait(until.urlIs('http://localhost:3000/login'), 10000); // ★要修正: ログアウト後のリダイレクト先
    await takeScreenshot('logout_screen.png');
    console.log('Logout Completed.');
  });
});