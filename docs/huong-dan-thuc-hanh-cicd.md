# Hướng dẫn thực hành CI/CD với GitHub Actions

Tài liệu thực hành từng bước dành cho sinh viên. Bạn sẽ lấy mã nguồn ứng dụng **Việc cần làm**, tự đưa lên GitHub, tự viết workflow CI/CD, bảo vệ nhánh `main`, deploy website lên GitHub Pages và phát hành phiên bản bằng tag.

---

## Mục lục

1. [Mục tiêu bài thực hành](#1-mục-tiêu-bài-thực-hành)
2. [Chuẩn bị](#2-chuẩn-bị)
3. [Tổng quan dự án](#3-tổng-quan-dự-án)
4. [Phần A – Lấy mã nguồn và tạo repo](#4-phần-a--lấy-mã-nguồn-và-tạo-repo)
5. [Phần B – Chạy và kiểm tra ở máy](#5-phần-b--chạy-và-kiểm-tra-ở-máy)
6. [Phần C – Viết workflow CI đầu tiên](#6-phần-c--viết-workflow-ci-đầu-tiên)
7. [Phần D – Thêm unit test và E2E test vào CI](#7-phần-d--thêm-unit-test-và-e2e-test-vào-ci)
8. [Phần E – Bảo vệ nhánh main](#8-phần-e--bảo-vệ-nhánh-main)
9. [Phần F – Pull request bị CI chặn](#9-phần-f--pull-request-bị-ci-chặn)
10. [Phần G – Deploy lên GitHub Pages](#10-phần-g--deploy-lên-github-pages)
11. [Phần H – Phát hành phiên bản bằng tag](#11-phần-h--phát-hành-phiên-bản-bằng-tag)
12. [Phần I – Tự động cập nhật thư viện với Dependabot](#12-phần-i--tự-động-cập-nhật-thư-viện-với-dependabot)
13. [Bài tập mở rộng](#13-bài-tập-mở-rộng)
14. [Sản phẩm cần nộp](#14-sản-phẩm-cần-nộp)
15. [Xử lý lỗi thường gặp](#15-xử-lý-lỗi-thường-gặp)
16. [Tài liệu tham khảo](#16-tài-liệu-tham-khảo)

---

## 1. Mục tiêu bài thực hành

Sau bài thực hành, bạn có thể:

- Chạy lint, unit test, E2E test và build một ứng dụng web ở máy.
- Viết workflow GitHub Actions gồm nhiều job chạy song song và nối tiếp.
- Đọc log trên tab **Actions** để tìm nguyên nhân khi CI báo lỗi.
- Dùng **Rulesets** bắt buộc mọi thay đổi phải qua pull request và CI phải xanh.
- Tự động deploy website lên **GitHub Pages** mỗi khi nhánh `main` thay đổi.
- Phát hành phiên bản trên **GitHub Releases** bằng cách đẩy tag.

---

## 2. Chuẩn bị

### 2.1 Phần mềm và tài khoản

| Cần có                                   | Cách kiểm tra                          | Link tải                      |
| ---------------------------------------- | -------------------------------------- | ----------------------------- |
| Tài khoản GitHub                         | Đăng nhập được github.com              | https://github.com/signup     |
| Git                                      | `git --version`                        | https://git-scm.com/downloads |
| Node.js 24 trở lên                       | `node -v` in ra `v24.x.x` hoặc cao hơn | https://nodejs.org            |
| VS Code                                  | Mở được thư mục dự án                  | https://code.visualstudio.com |
| GitHub CLI (khuyến nghị)                 | `gh --version`                         | https://cli.github.com        |
| Extension ESLint và Prettier cho VS Code | Thấy gạch đỏ dưới code lỗi             | Marketplace trong VS Code     |

### 2.2 Đăng nhập Git với GitHub

GitHub không nhận mật khẩu tài khoản khi `git push`. Chọn một trong hai cách:

- **GitHub CLI:** chạy `gh auth login`, chọn **GitHub.com** → **HTTPS** → **Login with a web browser**, rồi làm theo hướng dẫn trên trình duyệt.
- **Git Credential Manager:** có sẵn trong Git for Windows. Lần đầu `git push`, một cửa sổ đăng nhập GitHub sẽ hiện ra.

Khai báo tên và email cho Git nếu chưa làm:

```bash
git config --global user.name "Họ Tên"
git config --global user.email "email-cua-ban@example.com"
```

### 2.3 Chi phí

Dùng **repo public** thì GitHub Actions, GitHub Pages và Rulesets đều miễn phí. Bài thực hành này dùng repo public.

---

## 3. Tổng quan dự án

### 3.1 Ứng dụng

Ứng dụng **Việc cần làm** viết bằng HTML, CSS và JavaScript thuần, chạy bằng Vite:

- Thêm công việc; báo lỗi khi ô nhập trống hoặc dài hơn 100 ký tự.
- Đánh dấu hoàn thành, xoá từng việc, xoá mọi việc đã xong.
- Lọc theo **Tất cả**, **Đang làm**, **Đã xong**; đếm số việc chưa xong.
- Lưu dữ liệu vào `localStorage`, tải lại trang vẫn còn.

### 3.2 Pipeline bạn sẽ xây dựng

```text
Push / Pull request vào main
   ├── Lint       (ESLint + Prettier)   ┐
   ├── Unit test  (Vitest + coverage)   ├─ chạy song song
   └── E2E test   (Playwright)          ┘
          │  cả 3 xanh
          ▼
        Build (vite build → dist/)
          │  chỉ khi code đã vào nhánh main
          ▼
        Deploy → GitHub Pages

Push tag v*.*.*  →  Release (lint, test, build, nén zip) → GitHub Releases
```

### 3.3 Cấu trúc mã nguồn

| Đường dẫn                              | Vai trò                                                           |
| -------------------------------------- | ----------------------------------------------------------------- |
| `index.html`                           | Khung giao diện                                                   |
| `src/todo.js`                          | Logic thuần (không đụng DOM): thêm, xoá, đổi trạng thái, lọc, đếm |
| `src/main.js`                          | Bắt sự kiện, gọi logic, lưu `localStorage`, vẽ lại danh sách      |
| `src/style.css`                        | Giao diện                                                         |
| `tests/unit/todo.test.js`              | 13 unit test cho `src/todo.js`                                    |
| `tests/e2e/todo.spec.js`               | 4 kịch bản test giao diện bằng trình duyệt thật                   |
| `eslint.config.js`, `.prettierrc.json` | Quy tắc kiểm tra code và định dạng                                |
| `vite.config.js`                       | `base: './'` để chạy được trên GitHub Pages; ngưỡng coverage 90%  |
| `playwright.config.js`                 | Tự build, chạy server ở cổng 4173 rồi chạy E2E test               |
| `.github/`                             | Workflow và cấu hình Dependabot. **Bạn sẽ tự viết thư mục này**   |

### 3.4 Các lệnh npm

| Lệnh                    | Tác dụng                                                      |
| ----------------------- | ------------------------------------------------------------- |
| `npm install`           | Cài thư viện                                                  |
| `npm run dev`           | Chạy thử tại `http://localhost:5173`, tự tải lại khi sửa code |
| `npm run lint`          | Kiểm tra lỗi code bằng ESLint                                 |
| `npm run format:check`  | Kiểm tra định dạng bằng Prettier                              |
| `npm run format`        | Tự sửa định dạng                                              |
| `npm test`              | Chạy unit test                                                |
| `npm run test:coverage` | Chạy unit test và đo độ phủ code                              |
| `npm run test:e2e`      | Chạy test giao diện bằng Playwright                           |
| `npm run build`         | Đóng gói ứng dụng vào thư mục `dist/`                         |
| `npm run preview`       | Xem bản build ở máy                                           |

> **Nguyên tắc quan trọng:** mỗi bước trong CI chỉ là một lệnh npm ở bảng trên. Khi CI báo đỏ, hãy chạy lại đúng lệnh đó ở máy để tái hiện lỗi.

---

## 4. Phần A – Lấy mã nguồn và tạo repo

### Bước A1 – Tải mã nguồn

Mở terminal tại thư mục bạn muốn làm bài, chạy:

```bash
git clone https://github.com/Trung3Tech/github-cicd-demo.git
cd github-cicd-demo
```

Xoá lịch sử Git cũ và thư mục `.github` có sẵn (bạn sẽ tự viết lại ở các phần sau):

- macOS / Linux / Git Bash:

  ```bash
  rm -rf .git .github
  ```

- Windows PowerShell:

  ```powershell
  Remove-Item -Recurse -Force .git, .github
  ```

Mở dự án bằng VS Code:

```bash
code .
```

**Kiểm tra:** thư mục dự án có `src/`, `tests/`, `package.json` và **không còn** `.git/`, `.github/`.

### Bước A2 – Tạo repo trống trên GitHub

1. Trên github.com bấm dấu **+** góc trên bên phải → **New repository**.
2. **Repository name:** `github-cicd-demo`.
3. Chọn **Public**.
4. **Không** tích _Add a README file_, **không** chọn _.gitignore_ và _license_. Repo phải trống để lần push đầu không bị xung đột.
5. Bấm **Create repository**.

**Kiểm tra:** trang repo trống, có đoạn hướng dẫn _“…or push an existing repository from the command line”_.

### Bước A3 – Đẩy mã nguồn lên GitHub

Thay `<tai-khoan>` bằng tên tài khoản GitHub của bạn:

```bash
git init -b main
git add .
git status
```

Xem kết quả `git status`: **không được** có `node_modules/`, `dist/`, `coverage/` trong danh sách. Các thư mục này đã được liệt kê trong `.gitignore`.

```bash
git commit -m "feat: todo app source code"
git remote add origin https://github.com/<tai-khoan>/github-cicd-demo.git
git push -u origin main
```

**Kiểm tra:** tải lại trang repo trên GitHub, thấy đầy đủ các file. Tab **Actions** chưa có lần chạy nào vì chưa có workflow.

---

## 5. Phần B – Chạy và kiểm tra ở máy

### Bước B1 – Cài thư viện và chạy ứng dụng

```bash
npm install
npm run dev
```

Kết quả mong đợi:

```text
  VITE ready in ... ms
  ➜  Local:   http://localhost:5173/
```

Mở `http://localhost:5173`, thử:

1. Bấm **Thêm** khi ô trống → hiện thông báo _Vui lòng nhập tên công việc._
2. Thêm 3 công việc, đánh dấu hoàn thành 1 việc.
3. Bấm các nút lọc **Tất cả**, **Đang làm**, **Đã xong**.
4. Tải lại trang (F5): dữ liệu vẫn còn.

Dừng server bằng `Ctrl + C`.

> `npm install` tạo file `package-lock.json` ghi chính xác phiên bản từng thư viện. Trên CI ta dùng `npm ci` để cài đúng theo file này, nên **luôn commit `package-lock.json`**.

### Bước B2 – Đọc code

Mở lần lượt các file và trả lời câu hỏi:

| File                      | Câu hỏi tự kiểm tra                                                      |
| ------------------------- | ------------------------------------------------------------------------ |
| `src/todo.js`             | Vì sao các hàm ở đây không đọc DOM và không ghi `localStorage`?          |
| `src/main.js`             | Hàm `update()` gọi những hàm nào, theo thứ tự nào?                       |
| `index.html`              | Ô nhập có `label` nội dung gì? Thẻ nào có `role="alert"`?                |
| `tests/unit/todo.test.js` | `describe`, `it`, `expect` dùng để làm gì? `it.each` chạy bao nhiêu lần? |
| `tests/e2e/todo.spec.js`  | Test tìm nút **Thêm** và ô nhập bằng cách nào?                           |

Gợi ý: `src/todo.js` chỉ gồm **hàm thuần** (cùng đầu vào luôn cho cùng kết quả, không sửa dữ liệu gốc), nên unit test chỉ cần gọi hàm và so sánh kết quả.

### Bước B3 – Lint và kiểm tra định dạng

```bash
npm run lint
npm run format:check
```

Kết quả mong đợi: `npm run lint` không in lỗi nào; `format:check` in dòng:

```text
All matched files use Prettier code style!
```

- **ESLint** bắt lỗi logic: biến khai báo mà không dùng (`no-unused-vars`), so sánh `==` thay vì `===` (`eqeqeq`), dùng `let` cho biến không đổi (`prefer-const`).
- **Prettier** thống nhất định dạng: dấu nháy đơn, mỗi dòng tối đa 100 ký tự.

### Bước B4 – Unit test và coverage

```bash
npm test
npm run test:coverage
```

Kết quả mong đợi:

```text
 Test Files  1 passed (1)
      Tests  13 passed (13)

File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
 todo.js  |     100 |    93.33 |     100 |     100
```

Mở file `coverage/index.html` bằng trình duyệt để xem báo cáo chi tiết. Ngưỡng coverage 90% được đặt trong `vite.config.js`; nếu độ phủ thấp hơn, lệnh `test:coverage` báo lỗi.

### Bước B5 – E2E test với Playwright

Lần đầu cần tải trình duyệt Chromium (khoảng 100 MB):

```bash
npx playwright install chromium
npm run test:e2e
```

Kết quả mong đợi:

```text
Running 4 tests using 4 workers
  ✓ ... hiển thị tiêu đề và danh sách trống
  ✓ ... báo lỗi khi bấm Thêm với ô trống
  ✓ ... giữ dữ liệu sau khi tải lại trang
  ✓ ... thêm, hoàn thành và lọc công việc

  4 passed
```

Xem trực quan từng thao tác của test:

```bash
npx playwright test --ui
```

> Playwright tự chạy `npm run build`, mở server ở cổng 4173, chạy test rồi tự tắt server. Bạn không cần chạy `npm run dev` trước.

### Bước B6 – Build

```bash
npm run build
```

**Kiểm tra:** có thư mục `dist/` chứa `index.html` và thư mục `assets/`. Đây là bản sẽ được deploy lên GitHub Pages.

---

## 6. Phần C – Viết workflow CI đầu tiên

Ở phần này bạn viết workflow chỉ có một job **Lint**, đẩy lên GitHub và xem nó chạy.

### Bước C1 – Tạo file workflow

Tạo file `.github/workflows/ci.yml` (tạo cả hai thư mục `.github` và `workflows`) với nội dung:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
```

> YAML phân biệt thụt lề. Dùng **2 dấu cách**, không dùng phím Tab. Sau khi gõ xong, chạy `npm run format` để Prettier tự căn chỉnh, rồi `npm run format:check` phải báo xanh.

Ý nghĩa từng khối:

| Khối                                  | Ý nghĩa                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `name: CI`                            | Tên workflow hiển thị trên tab Actions                        |
| `on: push`                            | Chạy khi có commit mới trên nhánh `main`                      |
| `on: pull_request`                    | Chạy khi mở hoặc cập nhật pull request vào `main`             |
| `on: workflow_dispatch`               | Cho phép bấm nút chạy tay trên tab Actions                    |
| `permissions: contents: read`         | Chỉ cấp quyền đọc mã nguồn, đủ cho việc kiểm tra              |
| `concurrency`                         | Push mới vào cùng nhánh sẽ huỷ lần chạy cũ còn đang dở        |
| `runs-on: ubuntu-latest`              | Job chạy trên máy ảo Ubuntu do GitHub cung cấp                |
| `actions/checkout`                    | Tải mã nguồn của repo vào máy ảo                              |
| `actions/setup-node` với `cache: npm` | Cài Node.js 24 và lưu cache thư viện để lần sau cài nhanh hơn |
| `npm ci`                              | Cài thư viện đúng theo `package-lock.json`                    |
| `name: Lint`                          | Tên hiển thị của job, cũng là **tên check** dùng ở Phần E     |

### Bước C2 – Commit và push

```bash
git add .github
git commit -m "ci: add lint workflow"
git push
```

### Bước C3 – Xem kết quả trên tab Actions

1. Mở repo trên GitHub → tab **Actions**.
2. Bấm vào lần chạy **ci: add lint workflow**.
3. Bấm job **Lint** để xem log từng step. Bấm vào một step để mở rộng log.

**Kết quả mong đợi:** job **Lint** có dấu tích xanh, chạy khoảng 30 giây.

**Thử thêm:** vào tab **Actions** → chọn workflow **CI** ở cột trái → **Run workflow** → **Run workflow** để chạy tay.

---

## 7. Phần D – Thêm unit test và E2E test vào CI

### Bước D1 – Thêm hai job mới

Mở `.github/workflows/ci.yml`, thêm vào **cuối file** (cùng mức thụt lề với `lint:`):

<!-- prettier-ignore -->
```yaml
  unit-test:
    name: Unit test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: coverage-report
          path: coverage/

  e2e-test:
    name: E2E test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
```

| Khối                                          | Ý nghĩa                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Ba job không có `needs`                       | Chạy **song song** trên ba máy ảo khác nhau                              |
| `npx playwright install --with-deps chromium` | Cài Chromium và các thư viện hệ thống cần thiết trên Ubuntu              |
| `upload-artifact` với `if: always()`          | Luôn lưu báo cáo coverage, kể cả khi test fail                           |
| `upload-artifact` với `if: failure()`         | Chỉ lưu báo cáo Playwright khi E2E test fail, giúp xem ảnh chụp và trace |

### Bước D2 – Kiểm tra, commit và push

```bash
npm run format:check
git add .github
git commit -m "ci: add unit and e2e test jobs"
git push
```

### Bước D3 – Đọc kết quả

1. Tab **Actions** → lần chạy mới nhất.
2. Trang **Summary** hiện sơ đồ ba job **Lint**, **Unit test**, **E2E test** chạy song song.
3. Cuối trang Summary có mục **Artifacts**: tải `coverage-report`, giải nén, mở `index.html`.

**Kết quả mong đợi:** cả ba job xanh.

---

## 8. Phần E – Bảo vệ nhánh main

Mục tiêu: không ai push thẳng lên `main` được nữa; mọi thay đổi phải qua pull request và cả ba check phải xanh.

> Tên check chỉ xuất hiện trong danh sách chọn **sau khi workflow đã chạy ít nhất một lần**. Hãy chắc chắn Phần D đã xanh.

### Bước E1 – Tạo ruleset

1. Repo → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**.
2. **Ruleset name:** `protect-main`.
3. **Enforcement status:** **Active**.
4. **Target branches** → **Add target** → **Include default branch**.
5. Ở mục **Branch rules**, tích:
   - **Restrict deletions**
   - **Block force pushes**
   - **Require a pull request before merging** (để **Required approvals** bằng `0` vì bạn làm một mình)
   - **Require status checks to pass** → **Add checks** → gõ và chọn lần lượt **Lint**, **Unit test**, **E2E test**
6. Bấm **Create**.

### Bước E2 – Kiểm chứng

Thử push thẳng lên `main`:

```bash
git commit --allow-empty -m "test: direct push"
git push
```

**Kết quả mong đợi:** lệnh push bị từ chối với thông báo có dòng _Changes must be made through a pull request_ và các check bắt buộc.

Huỷ commit thử vừa tạo ở máy:

```bash
git reset --hard origin/main
```

---

## 9. Phần F – Pull request bị CI chặn

Từ đây, mỗi thay đổi đều làm theo quy trình: **tạo nhánh → sửa code → push nhánh → mở pull request → chờ CI → merge**.

### Bước F1 – Pull request có lỗi lint

Tạo nhánh mới:

```bash
git checkout -b feature/debug-flag
```

Trong `src/main.js`, ngay dưới dòng `let currentFilter = 'all';`, thêm:

```js
const debugMode = true;
```

Chạy thử ở máy:

```bash
npm run lint
```

Kết quả:

```text
src/main.js
  23:7  error  'debugMode' is assigned a value but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

Cố tình đẩy lỗi lên để xem CI chặn:

```bash
git commit -am "feat: add debug flag"
git push -u origin feature/debug-flag
```

Trên GitHub, bấm **Compare & pull request** → **Create pull request**.

**Kết quả mong đợi:**

- Check **CI / Lint** đỏ; **Unit test** và **E2E test** xanh.
- Nút **Merge pull request** bị khoá, kèm thông báo check bắt buộc **Lint** chưa thành công.

Tìm nguyên nhân trên GitHub: bấm **Details** cạnh check **Lint** → mở step `Run npm run lint` đang đỏ → đọc dòng lỗi **đầu tiên**.

### Bước F2 – Sửa lỗi và merge

Xoá dòng `const debugMode = true;` vừa thêm, rồi:

```bash
npm run lint
git commit -am "fix: remove unused debug flag"
git push
```

**Kết quả mong đợi:** pull request tự chạy lại CI, cả ba check xanh, nút **Merge pull request** mở khoá.

Bấm **Merge pull request** → **Confirm merge** → **Delete branch**. Sau đó cập nhật máy:

```bash
git checkout main
git pull
```

### Bước F3 – Pull request có lỗi unit test

```bash
git checkout -b feature/broken-filter
```

Trong `src/todo.js`, sửa dòng bộ lọc `active` bằng cách **bỏ dấu `!`**:

```js
if (filter === 'active') return todos.filter((todo) => todo.done);
```

Chạy thử ở máy:

```bash
npm test
```

Kết quả:

```text
 FAIL  tests/unit/todo.test.js > filterTodos và countActive > bộ lọc "active"
AssertionError: expected [ 2 ] to deeply equal [ 1 ]

      Tests  1 failed | 12 passed (13)
```

Push và mở pull request:

```bash
git commit -am "refactor: change active filter"
git push -u origin feature/broken-filter
```

**Kết quả mong đợi:** cả **Unit test** và **E2E test** cùng đỏ.

- Unit test chỉ ra **chính xác hàm nào sai**.
- E2E test chỉ ra **tính năng nào hỏng** với người dùng (kịch bản lọc công việc).

Xem báo cáo E2E: vào trang lần chạy → mục **Artifacts** → tải `playwright-report`, giải nén vào thư mục dự án, chạy:

```bash
npx playwright show-report playwright-report
```

Đóng pull request mà không merge: bấm **Close pull request** → **Delete branch**. Ở máy:

```bash
git checkout main
git branch -D feature/broken-filter
```

### Bước F4 – Lỗi định dạng (tự làm)

1. Tạo nhánh `feature/format-error`.
2. Trong `src/main.js`, đổi một chuỗi dùng nháy đơn `'...'` sang nháy kép `"..."`.
3. Chạy `npm run format:check`, đọc thông báo lỗi.
4. Push, mở pull request, quan sát check **Lint** đỏ ở step `format:check`.
5. Sửa bằng `npm run format`, commit, push, đợi xanh rồi merge.

---

## 10. Phần G – Deploy lên GitHub Pages

### Bước G1 – Bật GitHub Pages

1. Repo → **Settings** → **Pages**.
2. Mục **Build and deployment** → **Source**: chọn **GitHub Actions**.

### Bước G2 – Thêm job build và deploy

```bash
git checkout main
git pull
git checkout -b ci/deploy-pages
```

Mở `.github/workflows/ci.yml`, thêm vào **cuối file**:

<!-- prettier-ignore -->
```yaml
  build:
    name: Build
    needs: [lint, unit-test, e2e-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist/

  deploy:
    name: Deploy to GitHub Pages
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

| Khối                                         | Ý nghĩa                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `needs: [lint, unit-test, e2e-test]`         | Chỉ build khi cả ba check đều xanh                                                                           |
| `actions/upload-pages-artifact`              | Đóng gói thư mục `dist/` thành artifact dành cho Pages                                                       |
| `if: github.ref == 'refs/heads/main'`        | Chỉ deploy từ nhánh `main`. Trên pull request, `github.ref` có dạng `refs/pull/<số>/merge` nên job bị bỏ qua |
| `permissions: pages: write, id-token: write` | Quyền deploy Pages, chỉ cấp cho riêng job này                                                                |
| `environment: github-pages`                  | Ghi lịch sử deploy và hiện link website trên trang lần chạy                                                  |

### Bước G3 – Mở pull request và merge

```bash
npm run format:check
git add .github
git commit -m "ci: build and deploy to GitHub Pages"
git push -u origin ci/deploy-pages
```

Mở pull request trên GitHub.

**Kết quả mong đợi trên pull request:** **Lint**, **Unit test**, **E2E test**, **Build** xanh; **Deploy to GitHub Pages** hiện trạng thái _skipped_ (bị bỏ qua).

Merge pull request, rồi vào tab **Actions** xem lần chạy trên `main`.

**Kết quả mong đợi trên main:** job **Deploy to GitHub Pages** xanh, hiện link dạng:

```text
https://<tai-khoan>.github.io/github-cicd-demo/
```

Mở link, dùng thử ứng dụng. Trang chủ repo có thêm mục **Deployments** → `github-pages` ghi lịch sử các lần deploy.

> `base: './'` trong `vite.config.js` là bắt buộc. Thiếu dòng này, website hiện trang trắng vì trình duyệt tìm file JS, CSS ở `/assets/` thay vì `/github-cicd-demo/assets/`.

### Bước G4 – Trọn một vòng CI/CD

1. Tạo nhánh `feature/new-subtitle`.
2. Trong `index.html`, sửa dòng `Demo CI/CD với GitHub Actions` thành `Bài thực hành CI/CD của <Họ Tên>`.
3. Commit, push, mở pull request, đợi ba check xanh, merge.
4. Khoảng 2 phút sau, tải lại website trên GitHub Pages: dòng phụ đề đã đổi.

---

## 11. Phần H – Phát hành phiên bản bằng tag

### Bước H1 – Viết workflow release

```bash
git checkout main
git pull
git checkout -b ci/release
```

Tạo file `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write

jobs:
  release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    env:
      TAG: ${{ github.ref_name }}
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - name: Zip the build
        run: cd dist && zip -r "../todo-app-$TAG.zip" .
      - name: Publish release
        run: >
          gh release create "$TAG" "todo-app-$TAG.zip"
          --title "$TAG" --generate-notes
```

| Khối                                     | Ý nghĩa                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `tags: ['v*.*.*']`                       | Chạy khi đẩy tag dạng `v1.0.0`, `v1.2.3`                                            |
| `permissions: contents: write`           | Bắt buộc để tạo release                                                             |
| `TAG: ${{ github.ref_name }}`            | Tên tag vừa đẩy, ví dụ `v1.0.0`                                                     |
| `GH_TOKEN: ${{ github.token }}`          | Token tự động của mỗi lần chạy, **không cần tạo secret**                            |
| Lint, test, build lại                    | Workflow CI không chạy khi đẩy tag, nên release tự kiểm tra lại trước khi phát hành |
| `gh release create ... --generate-notes` | Tạo release, đính kèm file zip, tự sinh ghi chú từ các pull request đã merge        |

Commit, push, mở pull request, đợi xanh rồi merge:

```bash
npm run format:check
git add .github
git commit -m "ci: release workflow on version tags"
git push -u origin ci/release
```

### Bước H2 – Đẩy tag v1.0.0

Sau khi merge:

```bash
git checkout main
git pull
git tag v1.0.0
git push origin v1.0.0
```

**Kết quả mong đợi:**

- Tab **Actions**: workflow **Release** chạy và xanh.
- Cột phải trang repo → **Releases**: có `v1.0.0`, kèm ghi chú tự sinh và file `todo-app-v1.0.0.zip`.

Đặt tên tag theo **semantic versioning**:

| Thay đổi                        | Ví dụ từ `v1.0.0` |
| ------------------------------- | ----------------- |
| Sửa lỗi                         | `v1.0.1`          |
| Thêm tính năng, không phá vỡ cũ | `v1.1.0`          |
| Thay đổi lớn, không tương thích | `v2.0.0`          |

---

## 12. Phần I – Tự động cập nhật thư viện với Dependabot

### Bước I1 – Thêm cấu hình

```bash
git checkout main
git pull
git checkout -b ci/dependabot
```

Tạo file `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

Commit, push, mở pull request, đợi xanh rồi merge.

### Bước I2 – Quan sát

- Mỗi tuần, Dependabot tự mở pull request nâng phiên bản thư viện npm và các action trong workflow.
- CI tự chạy trên các pull request đó. Xanh nghĩa là bản mới không làm hỏng ứng dụng, bạn có thể merge.
- Xem trạng thái: repo → **Insights** → **Dependency graph** → tab **Dependabot**.

> Nếu mọi thư viện đều đang ở bản mới nhất, Dependabot sẽ không mở pull request nào. Đó là kết quả bình thường.

---

## 13. Bài tập mở rộng

Làm mỗi bài trên một nhánh riêng và merge qua pull request.

**Bài 1 – Badge trạng thái CI.** Tạo `README.md` ở thư mục gốc, thêm dòng sau (thay `<tai-khoan>`):

```markdown
![CI](https://github.com/<tai-khoan>/github-cicd-demo/actions/workflows/ci.yml/badge.svg)
```

Kết quả: trang chủ repo hiện huy hiệu **CI passing** màu xanh.

**Bài 2 – Thêm hàm và unit test.** Thêm hàm `countDone(todos)` vào `src/todo.js` trả về số việc đã xong. Viết ít nhất 2 unit test trong `tests/unit/todo.test.js`. Yêu cầu: `npm run test:coverage` vẫn đạt ngưỡng 90%.

**Bài 3 – Thêm E2E test.** Viết thêm một kịch bản trong `tests/e2e/todo.spec.js`: thêm 2 việc, đánh dấu xong 1 việc, bấm **Xoá việc đã xong**, kiểm tra danh sách còn đúng 1 việc. Gợi ý: dùng `page.getByRole('button', { name: 'Xoá việc đã xong' })`.

**Bài 4 – Test trên nhiều trình duyệt.** Trong `playwright.config.js`, thêm project `firefox` dùng `devices['Desktop Firefox']`. Trong `ci.yml`, đổi lệnh cài thành `npx playwright install --with-deps chromium firefox`.

**Bài 5 – Phát hành bản mới.** Sau khi merge các bài trên, đẩy tag `v1.1.0` và kiểm tra ghi chú release liệt kê đúng các pull request mới.

---

## 14. Sản phẩm cần nộp

| STT | Nội dung                                                                |
| --- | ----------------------------------------------------------------------- |
| 1   | Link repo GitHub (public)                                               |
| 2   | Link website trên GitHub Pages, phụ đề có họ tên của bạn                |
| 3   | Link release `v1.0.0` (và `v1.1.0` nếu làm bài tập mở rộng)             |
| 4   | Ảnh chụp pull request ở Bước F1: check **Lint** đỏ và nút merge bị khoá |
| 5   | Ảnh chụp trang Summary của một lần chạy CI trên `main` đủ 5 job xanh    |
| 6   | Ảnh chụp ruleset `protect-main` với ba check bắt buộc                   |

Tự kiểm tra trước khi nộp:

- [ ] Repo có `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`.
- [ ] Tab **Actions** có ít nhất một lần chạy CI trên `main` đủ 5 job xanh.
- [ ] Push thẳng lên `main` bị từ chối.
- [ ] Có ít nhất một pull request bị CI chặn và một pull request đã merge.
- [ ] Website trên GitHub Pages mở được và hoạt động đúng.
- [ ] Tab **Releases** có `v1.0.0` kèm file zip.

---

## 15. Xử lý lỗi thường gặp

| Hiện tượng                                                 | Nguyên nhân                                         | Cách sửa                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `git push` hỏi mật khẩu rồi báo lỗi                        | GitHub không nhận mật khẩu tài khoản cho Git        | Đăng nhập bằng `gh auth login` hoặc Git Credential Manager                                                                  |
| Push file workflow bị từ chối, báo thiếu quyền `workflow`  | Token đăng nhập chưa có quyền sửa workflow          | Chạy `gh auth refresh -h github.com -s workflow` rồi push lại                                                               |
| `npm ci` báo `package-lock.json` không khớp `package.json` | Thêm thư viện nhưng chưa commit `package-lock.json` | Chạy `npm install` ở máy, commit `package-lock.json`                                                                        |
| CI đỏ ở step `format:check`                                | Code hoặc file YAML chưa đúng định dạng Prettier    | Chạy `npm run format`, commit lại                                                                                           |
| Workflow không chạy, tab Actions báo lỗi cú pháp YAML      | Thụt lề sai hoặc dùng phím Tab                      | Dùng 2 dấu cách, các job cùng mức thụt lề với `lint:`                                                                       |
| `Executable doesn't exist` khi chạy Playwright             | Chưa cài trình duyệt                                | Ở máy: `npx playwright install chromium`; trong CI phải có step `npx playwright install --with-deps chromium`               |
| E2E báo `strict mode violation`                            | Một locator khớp nhiều phần tử                      | Dùng tên đầy đủ hơn hoặc thêm `exact: true`                                                                                 |
| E2E báo cổng 4173 đang bận                                 | Server từ lần chạy trước chưa tắt                   | macOS/Linux: `lsof -i :4173` rồi tắt tiến trình đó; Windows: `netstat -ano \| findstr 4173` rồi `taskkill /PID <số> /F`     |
| Không thấy tên check khi tạo ruleset                       | Workflow chưa chạy lần nào                          | Làm xong Phần D, đợi CI chạy xong rồi tạo ruleset                                                                           |
| `git push` lên `main` bị từ chối                           | Ruleset đang bật (đúng như mong muốn)               | Làm việc trên nhánh riêng và mở pull request                                                                                |
| Job deploy báo lỗi lấy thông tin Pages                     | Chưa bật GitHub Pages                               | **Settings → Pages → Source: GitHub Actions**, rồi **Re-run jobs**                                                          |
| Website trên Pages trắng, Console báo 404 file `.js`       | Thiếu `base: './'` trong `vite.config.js`           | Thêm lại dòng này, merge để deploy lại                                                                                      |
| Release báo `Resource not accessible by integration`       | Thiếu quyền ghi                                     | Thêm `permissions: contents: write` vào `release.yml`                                                                       |
| Đẩy tag nhưng workflow Release không chạy                  | `release.yml` chưa có trên commit được gắn tag      | Merge `release.yml` vào `main`, `git pull`, xoá tag cũ (`git tag -d v1.0.0`, `git push --delete origin v1.0.0`) rồi gắn lại |

**Cách đọc lỗi CI:** mở job đỏ → mở step đỏ → tìm dòng lỗi **đầu tiên** (không phải dòng cuối) → chạy lại đúng lệnh của step đó ở máy. Nếu lỗi chỉ xảy ra trên CI, bấm **Re-run jobs** và tích **Enable debug logging** để xem log chi tiết hơn.

---

## 16. Tài liệu tham khảo

| Chủ đề                              | Link                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions                      | https://docs.github.com/actions                                                                                             |
| Cú pháp workflow                    | https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions                                     |
| Rulesets                            | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets |
| GitHub Pages với workflow tuỳ chỉnh | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages                 |
| Deploy Vite lên GitHub Pages        | https://vite.dev/guide/static-deploy.html#github-pages                                                                      |
| `gh release create`                 | https://cli.github.com/manual/gh_release_create                                                                             |
| Dependabot                          | https://docs.github.com/en/code-security/dependabot                                                                         |
| ESLint                              | https://eslint.org/docs/latest/use/getting-started                                                                          |
| Prettier                            | https://prettier.io/docs/                                                                                                   |
| Vitest                              | https://vitest.dev/guide/                                                                                                   |
| Playwright                          | https://playwright.dev/docs/intro                                                                                           |
| Playwright trên CI                  | https://playwright.dev/docs/ci-intro                                                                                        |
