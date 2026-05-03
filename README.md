# Turbo Frame Modal (Rails 7.2 Demo)

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](README.vi.md)

A demo project showcasing how to build interactive modals using **Turbo Frame + Turbo Stream + Stimulus** in Rails, including:
- Nested modals (`main modal` and `sub modal`)
- Form submission inside/outside modals
- Loading states, button disabling, confirm/alert modals
- HTML/JSON error handling and request retry
- Menu reorder demo with Turbo Stream
- Remote data select demo (Choices.js)

## 1. Technologies Used

- Ruby `3.4.1`
- Rails `~> 7.2`
- SQLite3
- Hotwire: `turbo-rails`, `stimulus-rails`
- Importmap
- Tailwind CSS (`tailwindcss-rails`, `cssbundling-rails`) or Bootstrap 5 (`bootstrap`, `cssbundling-rails`)
- Flowbite (modal UI via CDN)
- Choices.js (remote select demo)

## 2. Main Structure

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
````

## 3. Modal Workflow

### 3.1 Two Independent Modals

Inside `app/views/layouts/_modals.html.erb`, there are two frames:

* `turbo_frame_tag 'modal_frame'` (Main Modal)
* `turbo_frame_tag 'sub_modal_frame'` (Sub Modal)

Each frame uses `data-controller='modals'` and is managed by `modals_controller.js`.

### 3.2 How Modals Open

Buttons/links/forms pass `data-turbo-frame`:

* `modal_frame` to open the main modal
* `sub_modal_frame` to open the sub modal

The `modals` controller automatically attaches events to elements with `data-turbo-frame` and listens for Turbo events such as:

* `turbo:click`
* `turbo:submit-start`
* `turbo:before-fetch-request`
* `turbo:before-fetch-response`
* `turbo:fetch-request-error`

### 3.3 Key Features in `modals_controller.js`

* Displays loading spinner while requests are running
* Disables buttons with `data-disable-on-request` + `data-disable-with`
* Opens modal immediately or only after response (`data-show-modal-when-response`)
* Supports confirm modal via `data-turbo-confirm` + `data-confirm-yes`
* Supports `POST/DELETE` via `data-turbo-method` + `data-post-params` / `data-delete-params`
* Parses HTML/JSON errors and renders error content inside modal
* Retry request button on failure
* Supports nested modal open/close via `data-handle-modal`
* Intercepts/manages `turbo:before-stream-render` to ensure correct frame updates while preserving modal state

## 4. Main Controllers and Routes

### 4.1 `HomeController`

The main demo area (root `/`):

* `count_all` / `count_all_in_modal`: counts table records and displays them in modal
* `sample_post`, `sample_post_validate`, `replace_the_form`: submit + validation + Turbo Stream frame replacement demo
* `sample_post_inside_modal*`: form inside modal + nested modal demo
* `test_modal_form*`: validation inside modal demo
* `test_confirm_modal` (`GET/POST/DELETE`): multi-method confirm modal demo

Note: This controller includes `sleep` and `sample_error` to simulate delays/random failures for UX testing.

### 4.2 `Demo::SettingsController`

* Page `/settings` + `/settings/reorder_menus`
* Saves menu order via session
* Returns Turbo Stream to:

  * Update save notification
  * Update `nav_frame` (header menu)

### 4.3 `Demo::StaticPagesController`

Renders static demo pages such as:

* `users`
* `products`
* `notifications`
* `choices-js`

### 4.4 `Demo::PetsController`

JSON API for Choices.js:

* `GET /demo/pets`
* `GET /demo/pet-hobbies`

Data source: `db/demo-pets.json`

## 5. Commonly Used `data-*` Attributes

* `data-turbo-frame="modal_frame|sub_modal_frame"`
* `data-disable-on-request="true"`
* `data-disable-with="Loading..."`
* `data-show-modal-when-response="true"`
* `data-turbo-confirm="Are you sure?"`
* `data-confirm-yes="OK"`
* `data-handle-modal="sub_modal_frame"`
* `data-closable="false"`
* `data-modal-title="Custom title"`
* `data-alert="..."` or `data-alert-selector="#selector"`

## 6. Run Locally

### 6.1 Installation

```bash
cd /workspaces/osom-tables-polymer/Turbo-Frame-Modal
bundle install
bin/rails db:prepare
```

Or run the setup script:

```bash
bin/setup
```

### 6.2 Start Server

Option 1 (recommended):

```bash
bin/dev
```

`bin/dev` uses `Procfile.dev` to run:

* Rails server
* Tailwind watcher

Option 2:

```bash
bin/rails server
```

Visit: `http://localhost:3000`

## 7. Demo Screenshots

The `screenshots/` directory already includes sample images:

* `top-home-page.png`
* `full-home-page.png`
* `menu-reorder.png`
* `choice-js.png`
* `sample-users-html.png`
* `sample-products-html.png`
* `sample-notifications-html.png`

## 8. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
