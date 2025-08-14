
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
    // ここではログイン後に表示されるはずの"Tasks"というテキストを持つh1要素を待つ
    await driver.wait(until.elementLocated(By.xpath('//h1[contains(text(), "Tasks")]')), 15000);

    // スクリーンショットを保存
    const screenshot = await driver.takeScreenshot();
    if (!fs.existsSync('./testimage')) {
      fs.mkdirSync('./testimage');
    }
    fs.writeFileSync('./testimage/login_success.png', screenshot, 'base64');

    // URLや特定の要素の存在をアサートして、ログイン成功を最終確認
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/tasks'); // ログイン後は/tasksページにいることを期待
  });
});
