class Demo::SettingsController < ApplicationController
  include Demo::SettingsHelper
  before_action :initial_menus

  def index
  end

  def reorder_menus
    return unless request.post?

    begin
      save_user_menus
    rescue StandardError => e
      flash.now[:error] = e.message
    end

    if flash.now[:error].present?
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: [
            turbo_stream.update('save_menus_frame', partial: 'demo/settings/save_menus_message'),
          ]
        end
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: [
            # show success message
            turbo_stream.update('save_menus_frame', partial: 'demo/settings/save_menus_message'),
            # update menu list
            turbo_stream.update('nav_frame', partial: 'layouts/nav'),
          ]
        end
      end
    end
  end

  private

  def user_menus_params
    params.require(:user_menus).permit(:selected_menus)
  end

  def parsed_user_menus
    array_string = user_menus_params.fetch(:selected_menus, '[]')
    menu_ids = JSON.parse(array_string) rescue []
    (menu_ids || []).map(&:to_i)
  end

  def initial_menus
    @user_menu_ids = user_settings_menus # array of menu ids
    if @user_menu_ids.nil?
      @selected_menus = []
      @available_menus = available_menus
    else
      @selected_menus = @user_menu_ids.map { |id| get_menu_by_id(id) }
      @available_menus = available_menus.reject { |menu| @user_menu_ids.include?(menu[:id]) }
    end
  end

  def save_user_menus
    sleep 3
    if rand(1..10) > 5
      raise StandardError.new('Failed to save user menus')
    end

    menu_ids = parsed_user_menus
    session[:settings] = menu_ids.to_json
    flash.now[:success] = 'Your menus have been saved successfully.'
  end
end
