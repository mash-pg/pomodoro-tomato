
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as fs from 'fs';

// jestのタイムアウトを60秒に設定
jest.setTimeout(60000);

describe('Login Flow', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('should login successfully with valid credentials', async () => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      throw new Error('Test credentials are not defined in .env.local');
    }

    await driver.get('http://localhost:3000/login');

    // フォーム要素を待機して入力
    await driver.wait(until.elementLocated(By.id('email')), 10000);
    await driver.findElement(By.id('email')).sendKeys(email);
    await driver.findElement(By.id('password')).sendKeys(password);

    // ログインボタンをクリック
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    await loginButton.click();

    // ログイン後のリダイレクトと要素の表示を待機
    // ここではログイン後に表示されるはずの"ログイン中"というテキストを持つspan要素を待つ
    await driver.wait(until.elementLocated(By.xpath('//span[contains(@class, "text-gray-300") and contains(text(), "ログイン中")]')), 15000);

    // URLがルートページに変わるまで待機
    await driver.wait(until.urlIs('http://localhost:3000/'), 10000);

    // スクリーンショットを保存
    await driver.sleep(5000); // ページが完全にレンダリングされるまで5秒待機
    const screenshot = await driver.takeScreenshot();
    if (!fs.existsSync('./testimage')) {
      fs.mkdirSync('./testimage');
    }
    fs.writeFileSync('./testimage/login_success.png', screenshot, 'base64');

    // URLや特定の要素の存在をアサートして、ログイン成功を最終確認
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toEqual('http://localhost:3000/'); // ログイン後はルートページにいることを期待
  });
});
