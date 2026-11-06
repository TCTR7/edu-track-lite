import { expect, test } from "@playwright/test";
import { loginAs } from "../../../common/auth.helper";
import { ClassModalPage } from "../page/class-modal.page";

// Form-only checks: these tests never save changes to the database.
test.describe("Ca học – UX modal", () => {
  test("Cho phép xóa trắng, nhập lại và giữ đơn giá chỉnh tay khi tạo/sửa", async ({ page }) => {
    await loginAs(page, "admin");
    const modal = new ClassModalPage(page);
    await modal.createClassButton.click();
    await expect(modal.dialog).toBeVisible();
    await expect(modal.classNameInput).not.toBeFocused();
    await expect(modal.deductionInput).toHaveValue("50000");

    for (const input of [modal.sessionsInput, modal.tuitionInput]) {
      const initial = await input.inputValue();
      await input.focus();
      await input.press("ControlOrMeta+A");
      await input.press("Backspace");
      await expect(input).toHaveValue("");
      expect(await input.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
      await expect(modal.deductionInput).toHaveValue("50000");
      await input.fill(initial);
    }

    await modal.sessionsInput.fill("0");
    expect(await modal.sessionsInput.evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow)).toBe(true);
    await expect(modal.deductionInput).toHaveValue("50000");
    await modal.sessionsInput.fill("10");
    await expect(modal.deductionInput).toHaveValue("80000");
    await modal.tuitionInput.fill("1000000");
    await expect(modal.deductionInput).toHaveValue("100000");
    await modal.deductionInput.fill("");
    await expect(modal.deductionInput).toHaveValue("");
    await modal.tuitionInput.fill("900000");
    await expect(modal.deductionInput).toHaveValue("");
    await modal.deductionInput.fill("70000");
    await modal.sessionsInput.fill("12");
    await expect(modal.deductionInput).toHaveValue("70000");
    await modal.closeButton.click();

    await modal.openEdit();
    await expect(modal.dialog).toHaveAccessibleName("Chỉnh sửa Ca học");
    await expect(modal.classNameInput).not.toBeFocused();
    for (const input of [modal.sessionsInput, modal.tuitionInput, modal.deductionInput]) {
      await input.fill("");
      await expect(input).toHaveValue("");
    }
    await modal.sessionsInput.fill("8");
    await modal.tuitionInput.fill("800000");
    await modal.deductionInput.fill("90000");
    await expect(modal.deductionInput).toHaveValue("90000");
    await modal.closeButton.click();

    await modal.createClassButton.click();
    await expect(modal.sessionsInput).toHaveValue("16");
    await expect(modal.tuitionInput).toHaveValue("800000");
    await expect(modal.deductionInput).toHaveValue("50000");
  });

  test("Co theo viewport bàn phím, cuộn focus và vuốt ẩn bàn phím", async ({ page }) => {
    await loginAs(page, "admin");
    const modal = new ClassModalPage(page);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /interactive-widget=resizes-content/);
    await modal.createClassButton.click();
    await expect(modal.dialog).toBeVisible();

    // Simulate the visual viewport shrinking/panning without a native keyboard.
    await modal.resizeVisualViewport(360, 40);
    await expect(modal.dialog).toHaveCSS("max-height", "344px");
    await expect.poll(async () => {
      const bounds = await modal.dialog.boundingBox();
      return !!bounds && bounds.y >= 40 && bounds.y + bounds.height <= 400;
    }).toBe(true);
    expect(await modal.body.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(modal.body).toHaveCSS("scroll-padding-bottom", "32px");

    await modal.deductionInput.evaluate(el => {
      const scrollIntoView = el.scrollIntoView.bind(el);
      el.scrollIntoView = options => {
        el.setAttribute("data-scroll-block", typeof options === "object" ? options.block ?? "" : "");
        scrollIntoView(options);
      };
    });
    await modal.deductionInput.focus();
    await expect(modal.deductionInput).toHaveAttribute("data-scroll-block", "center");
    await expect(modal.deductionInput).toBeInViewport();
    await modal.swipeBody();
    await expect(modal.deductionInput).not.toBeFocused();

    await modal.body.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(modal.submitButton).toBeInViewport();
    await modal.closeButton.click();
    await expect(modal.dialog).not.toBeVisible();
    expect(await modal.dialog.evaluate(el => el.style.maxHeight)).toBe("");
    await modal.resizeVisualViewport(640);
    expect(await modal.dialog.evaluate(el => el.style.maxHeight)).toBe("");
    await modal.createClassButton.click();
    await expect(modal.dialog).toHaveCSS("max-height", "624px");
    await page.keyboard.press("Escape");
    await expect(modal.dialog).not.toBeVisible();
  });
});
