module ApplicationHelper
  def is_current_page?(menu_name, url)
    if turbo_frame_request?
      return menu_name == 'Settings'
    end

    current_page?(url)
  end
end
