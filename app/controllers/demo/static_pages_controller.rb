class Demo::StaticPagesController < ApplicationController
  def show
    sleep 2 # Simulate a slow request
    render params[:page]
  end
end
