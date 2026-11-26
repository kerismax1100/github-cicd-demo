import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('hiển thị tiêu đề và danh sách trống', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Việc cần làm' })).toBeVisible();
  await expect(page.getByText('0 việc chưa xong')).toBeVisible();
});

test('thêm, hoàn thành và lọc công việc', async ({ page }) => {
  const input = page.getByLabel('Công việc mới');
  await input.fill('Viết workflow CI');
  await page.getByRole('button', { name: 'Thêm' }).click();
  await input.fill('Bật branch protection');
  await input.press('Enter');

  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('2 việc chưa xong')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Viết workflow CI' }).check();
  await expect(page.getByText('1 việc chưa xong')).toBeVisible();

  await page.getByRole('button', { name: 'Đã xong', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem')).toContainText('Viết workflow CI');
});

test('báo lỗi khi bấm Thêm với ô trống', async ({ page }) => {
  await page.getByRole('button', { name: 'Thêm' }).click();
  await expect(page.getByRole('alert')).toHaveText('Vui lòng nhập tên công việc.');
});

test('giữ dữ liệu sau khi tải lại trang', async ({ page }) => {
  await page.getByLabel('Công việc mới').fill('Deploy GitHub Pages');
  await page.getByRole('button', { name: 'Thêm' }).click();
  await page.reload();
  await expect(page.getByText('Deploy GitHub Pages')).toBeVisible();
});
