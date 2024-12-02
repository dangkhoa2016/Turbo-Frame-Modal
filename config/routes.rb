Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  resources :home, only: [:index] do
    collection do
      get :count_all_in_modal
      get :count_all
      post :sample_post_validate
      post :sample_post
      post :replace_the_form
      get :sample_post_inside_modal1
      get :sample_post_inside_modal2
      get :sample_post_inside_modal3
      get :sample_post_inside_modal4
      get :sample_get_no_template
      get :sample_get_no_action
      get :test_modal_form1
      get :test_modal_form2
    end
  end

  namespace :demo do
    resources :static_pages, only: [:show]
  end

  get 'settings', to: 'demo/settings#index', as: :settings
  get 'settings/reorder_menus', to: 'demo/settings#reorder_menus'
  post 'settings/reorder_menus', to: 'demo/settings#reorder_menus', as: :update_setting_order_menus
  post 'settings', to: 'demo/settings#save', as: :save_settings
  get 'users', to: 'demo/static_pages#show', page: 'users', as: :users
  get 'products', to: 'demo/static_pages#show', page: 'products', as: :products
  get 'user_permissions', to: 'demo/static_pages#show', page: 'user_permissions', as: :user_permissions
  get 'product_categories', to: 'demo/static_pages#show', page: 'product_categories', as: :product_categories
  get 'notifications', to: 'demo/static_pages#show', page: 'notifications', as: :notifications
  
  get 'choices-js', to: 'demo/static_pages#show', page: 'choices-js', as: :choices_js
  get 'demo/pets', to: 'demo/pets#index', as: :pet_list
  get 'demo/pet-hobbies', to: 'demo/pets#pet_hobbies', as: :pet_hobbies

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  root "home#index"
end
