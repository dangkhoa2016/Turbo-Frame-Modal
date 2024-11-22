class HomeController < ApplicationController
  before_action :set_new_sample_post_test, only: [:index, :test_modal_form1, :test_modal_form2, :replace_the_form]
  prepend_view_path Rails.root.join('app', 'views', 'home')

  def index
    render 'main/index'
  end

  def count_all_in_modal
    render 'pages/count_all_in_modal'
  end

  def test_modal_form1
    render 'pages/test_modal_form1'
  end

  def test_modal_form2
    render 'pages/test_modal_form2'
  end

  def count_all
    # sleep 3 seconds
    sleep 3
    return if sample_error

    tables = ActiveRecord::Base.connection.tables

    @result = tables.map do |table|
      klass = table.classify.constantize rescue nil
      next if klass.nil?
      [table.titleize, klass.count]
    end.compact

    @result << ['SamplePostTest'.titleize, rand(100)]

    render 'pages/count_all'
  end

  def sample_post
    sleep 1
    return if sample_error

    @result = sample_post_params
    render template: 'pages/sample_post'
  end

  def sample_post_validate
    sleep 1
    @result = sample_post_test_params
    @sample_post_test = SamplePostTest.new(@result)

    is_valid = @sample_post_test.valid?

    respond_to do |format|
      format.html { render :index }
      format.turbo_stream do
        wrap_frame = params.dig(:sample_post_test, :wrap_frame) || ''
        partial_name = params.dig(:sample_post_test, :partial_name) || ''

        # just a test
        partial_name = 'submitted_values' if (partial_name == 'test_modal_form1' && is_valid)

        render turbo_stream: turbo_stream.replace(wrap_frame, partial: "partials/#{partial_name}")
      end
    end
  end

  def replace_the_form
    return if sample_error # test error

    @result = sample_post_test_params
    @sample_post_test = SamplePostTest.new(@result)

    is_valid = @sample_post_test.valid?
    wrap_frame = params.dig(:sample_post_test, :wrap_frame) || ''

    partial_name = wrap_frame
    # just a test
    if is_valid && wrap_frame.present? && wrap_frame == 'test_replace_the_form2'
      partial_name = 'submitted_values'
    end

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(wrap_frame, partial: "partials/#{partial_name}")
      end
    end
  end

  def sample_post_inside_modal1
    render 'pages/sample_post_inside_modal1'
  end

  def sample_post_inside_modal2
    sleep 3
    sample_post_inside_modal1
  end

  def sample_get_no_template
  end

  def sample_post_inside_modal3
    sleep 2
    render 'pages/show_modal_when_response'
  end

  def sample_post_inside_modal4
    render 'pages/sample_post_inside_modal4'
  end

  private

  def sample_error
    if rand(100) > 70
      raise 'Error test'
    elsif rand(100) > 70
      raise ActiveRecord::RecordNotFound
    elsif rand(100) > 70
      raise raise ActionController::RoutingError.new('Error test Not Found')
    elsif rand(100) > 70
      raise ActionController::UnknownFormat
    elsif rand(100) > 70
      render json: {
        error: 'Error test', some_data: [1,2,3,Date.today]
      }, status: :internal_server_error
    end
  end

  def sample_post_params
    params.require(:sample_post).permit(:name, :is_active)
  end

  def sample_post_test_params
    params.require(:sample_post_test).permit(:name, :is_active)
  end

  def set_new_sample_post_test
    @sample_post_test = SamplePostTest.new(name: '', is_active: false)
  end
end
