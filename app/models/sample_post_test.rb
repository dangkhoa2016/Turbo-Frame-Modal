class SamplePostTest
  include ActiveModel::Model  # This provides validations and error handling

  attr_accessor :name, :is_active  # Define the form fields

  # Validation for :name
  validates :name, presence: true

  def initialize(attributes = {})
    super
  end
end
