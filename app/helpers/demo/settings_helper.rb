module Demo::SettingsHelper
  NAV_MENUS = [
    { id: 1, name: 'Home', path: :root },
    { id: 2, name: 'Users', path: :users },
    { id: 3, name: 'Products', path: :products },
    { id: 4, name: 'User Permissions', path: :user_permissions },
    { id: 5, name: 'Product Categories', path: :product_categories },
    { id: 6, name: 'Notifications', path: :notifications },
    { id: 7, name: 'Settings', path: :settings },

  ]

  DONT_ALLOW_REMOVE = ['Home', 'Settings']

  def user_settings_menus
    return nil unless session.key?(:settings)

    JSON.parse(session[:settings] || '[]') rescue []
  end

  def user_menus
    user_menu = user_settings_menus
    menus = if user_menu.nil?
      NAV_MENUS.map { |menu| menu[:id] }
    else
      result = DONT_ALLOW_REMOVE.map { |menu| get_menu_by_text(menu)[:id] }
      result += (user_menu || []) # add home menu and settings
      result.uniq
    end

    menus.map { |id| NAV_MENUS.find { |menu| menu[:id] == id } }
  end

  def available_menus
    NAV_MENUS.reject { |menu| menu[:name].in?(DONT_ALLOW_REMOVE) }
  end

  def get_menu_by_text(text)
    NAV_MENUS.find { |menu| menu[:name] == text }
  end

  def get_menu_by_id(id)
    NAV_MENUS.find { |menu| menu[:id] == id.to_i }
  end

  def get_menu_link(id)
    menu = NAV_MENUS.find { |menu| menu[:id] == id.to_i }
    
    return '#' if menu.blank?
    
    # Handle the special case for 'Home' (root_path is a special route).
    return root_path if menu[:name] == 'Home'

    # Use the path symbol to dynamically generate the path helper.
    send("#{menu[:path]}_path")
  end
end
