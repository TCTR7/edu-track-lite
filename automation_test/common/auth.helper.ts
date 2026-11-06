import { expect, type Page } from "@playwright/test";
import { TEST_ACCOUNTS, type TestRole } from "./test-data";
import { LoginPage } from "../features/auth/page/login.page";

/**
 * Helper đăng nhập nhanh theo Role và kiểm tra điều hướng đúng trang đích.
 */
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(account.username, account.password);
  await expect(page).toHaveURL(new RegExp(account.defaultRedirectPath));
}
