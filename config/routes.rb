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

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  root "home#index"
end
