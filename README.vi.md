# Turbo Frame Modal (Rails 7.2 Demo)

> 🌐 Language / Ngôn ngữ: [English](README.md) | **Tiếng Việt**

Dự án demo cách xây dựng modal tương tác bằng **Turbo Frame + Turbo Stream + Stimulus** trong Rails, bao gồm:
- Modal lồng nhau (`main modal` và `sub modal`)
- Submit form trong/ngoài modal
- Xử lý loading, disable button, confirm/alert modal
- Xử lý lỗi HTML/JSON và retry request
- Demo reorder menu bằng Turbo Stream
- Demo select remote data (Choices.js)

## 1. Công nghệ sử dụng

- Ruby `3.4.1`
- Rails `~> 7.2`
- SQLite3
- Hotwire: `turbo-rails`, `stimulus-rails`
- Importmap
- Tailwind CSS (`tailwindcss-rails`, `cssbundling-rails`) hoặc Bootstrap 5 (`bootstrap`, `cssbundling-rails`)
- Flowbite (modal UI, pin qua CDN)
- Choices.js (remote select demo)

## 2. Cấu trúc chính

```text
app/
  controllers/
    home_controller.rb
    demo/settings_controller.rb
    demo/static_pages_controller.rb
    demo/pets_controller.rb
  javascript/
    application.js
    controllers/modals_controller.js
    controllers/reorder_menus_controller.js
    controllers/choices_controller.js
    controllers/choices_remote_data_controller.js
  views/
    home/main/_sample.html.erb
    home/partials/*
    layouts/_modals.html.erb
    demo/settings/*
config/
  routes.rb
  importmap.rb
db/
  demo-pets.json
screenshots/
```

## 3. Luồng hoạt động modal

### 3.1 Hai modal độc lập

Trong `app/views/layouts/_modals.html.erb` có 2 khung:
- `turbo_frame_tag 'modal_frame'` (Main Modal)
- `turbo_frame_tag 'sub_modal_frame'` (Sub Modal)

Mỗi khung dùng `data-controller='modals'` và được điều khiển bởi `modals_controller.js`.

### 3.2 Cách mở modal

Các nút/link/form truyền `data-turbo-frame`:
- `modal_frame` để mở main modal
- `sub_modal_frame` để mở sub modal

Controller `modals` tự động gắn event vào phần tử có `data-turbo-frame`, bắt các event Turbo như:
- `turbo:click`
- `turbo:submit-start`
- `turbo:before-fetch-request`
- `turbo:before-fetch-response`
- `turbo:fetch-request-error`

### 3.3 Tính năng quan trọng trong `modals_controller.js`

- Hiển thị loading spinner khi request đang chạy
- Disable button với `data-disable-on-request` + `data-disable-with`
- Mở modal ngay hoặc chỉ mở khi response (`data-show-modal-when-response`)
- Hỗ trợ confirm modal qua `data-turbo-confirm` + nút `data-confirm-yes`
- Hỗ trợ `POST/DELETE` qua `data-turbo-method` + `data-post-params`/`data-delete-params`
- Parse lỗi HTML/JSON và render nội dung lỗi trong modal
- Nút Retry request khi lỗi
- Hỗ trợ đóng/mở modal lồng nhau theo `data-handle-modal`
- Chặn/điều phối `turbo:before-stream-render` để đảm bảo update đúng frame và giữ trạng thái modal

## 4. Controller và route chính

### 4.1 `HomeController`

Là khu vực demo chính (root `/`):
- `count_all` / `count_all_in_modal`: đếm số bản ghi bảng và hiển thị trong modal
- `sample_post`, `sample_post_validate`, `replace_the_form`: demo submit + validate + replace frame bằng Turbo Stream
- `sample_post_inside_modal*`: demo form trong modal và modal lồng nhau
- `test_modal_form*`: demo validate trong modal
- `test_confirm_modal` (`GET/POST/DELETE`): demo confirm modal đa phương thức

Lưu ý: controller có `sleep` và `sample_error` tạo lỗi ngẫu nhiên để test UX xử lý lỗi/retry.

### 4.2 `Demo::SettingsController`

- Trang `/settings` + `/settings/reorder_menus`
- Lưu thứ tự menu qua session
- Trả về Turbo Stream để:
  - update thông báo save
  - update `nav_frame` (menu trên header)

### 4.3 `Demo::StaticPagesController`

Render các trang demo tĩnh: `users`, `products`, `notifications`, `choices-js`, ...

### 4.4 `Demo::PetsController`

API JSON phục vụ Choices.js:
- `GET /demo/pets`
- `GET /demo/pet-hobbies`

Dữ liệu nguồn từ `db/demo-pets.json`.

## 5. Các thuộc tính data-* hay dùng

- `data-turbo-frame="modal_frame|sub_modal_frame"`
- `data-disable-on-request="true"`
- `data-disable-with="Loading..."`
- `data-show-modal-when-response="true"`
- `data-turbo-confirm="Are you sure?"`
- `data-confirm-yes="OK"`
- `data-handle-modal="sub_modal_frame"`
- `data-closable="false"`
- `data-modal-title="Custom title"`
- `data-alert="..."` hoặc `data-alert-selector="#selector"`

## 6. Chạy dự án local

### 6.1 Cài đặt

```bash
cd /workspaces/osom-tables-polymer/Turbo-Frame-Modal
bundle install
bin/rails db:prepare
```

Hoặc chạy script setup:

```bash
bin/setup
```

### 6.2 Chạy server

Cách 1 (khuyên dùng):

```bash
bin/dev
```

`bin/dev` dùng `Procfile.dev` để chạy:
- Rails server
- Tailwind watch

Cách 2:

```bash
bin/rails server
```

Truy cập: `http://localhost:3000`

## 7. Ảnh demo

Thư mục `screenshots/` đã có sẵn một số ảnh minh hoạ:
- `top-home-page.png`
- `full-home-page.png`
- `menu-reorder.png`
- `choice-js.png`
- `sample-users-html.png`
- `sample-products-html.png`
- `sample-notifications-html.png`

## 8. License
Dự án này được cấp phép theo giấy phép MIT - xem tệp [LICENSE](LICENSE) để biết chi tiết.
