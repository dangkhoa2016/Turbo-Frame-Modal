class Demo::PetsController < ApplicationController
  
  def index
    page = params[:page] || 1
    per_page = params[:per_page] || 10
    keyword = params[:keyword] || ''
    from_index = (page.to_i - 1) * per_page.to_i
    to_index = from_index + per_page.to_i

    @pets = all_pets.select do |pet|
      pet['name'].downcase.include?(keyword.downcase)
    end.slice(from_index, to_index)

    render json: (@pets.map do |pet|
      {
        value: pet['id'],
        label: pet['name'],
      }
    end)
  end

  def all_pets
    if session[:all_pets].nil?
      session[:all_pets] = JSON.parse(File.read(Rails.root.join('db', 'demo-pets.json')))
    end

    session[:all_pets]
  end

  def pet_hobbies
    data = generate_pet_hobbies(params[:pet])

    render json: (data.map do |hobby|
      {
        value: hobby.parameterize,
        label: hobby,
      }
    end)
  end

  def generate_pet_hobbies(pet_id)
    hobbies = [
      'Playing with toys',
      'Running around',
      'Chasing things',
      'Eating',
      'Sleeping',
      'Cuddling',
      'Barking',
      'Meowing',
      'Singing',
      'Swimming',
      'Flying',
      'Digging',
      'Jumping',
      'Hiding',
      'Exploring',
      'Grooming',
      'Sunbathing',
      'Climbing',
      'Hunting',
      'Socializing',
      'Training',
      'Watching TV',
      'Playing games',
      'Learning tricks',
      'Talking',
      'Dancing',
      'Rolling',
      'Purring',
      'Squeaking',
      'Hopping',
      'Napping',
      'Roaming',
      'Sniffing',
      'Chewing',
      'Licking',
      'Preening',
      'Pouncing',
      'Squealing',
      'Wheeking',
      'Grazing',
      'Kicking'
    ]
  
    case pet_id
    when 'cat', 'hamster', 'parrot', 'goldfish', 'rabbit', 'turtle', 'snake', 'lizard'
      return hobbies[0..4]
    when 'dog', 'chicken', 'duck', 'goose', 'cow', 'pig', 'horse', 'sheep', 'goat'
      return hobbies[6..9]
    when 'donkey', 'alpaca', 'llama', 'guinea-pig', 'ferret', 'hedgehog', 'chinchilla', 'rat', 'mouse', 'gerbil'
      return hobbies[11..14]
    when 'bee', 'butterfly', 'dragonfly', 'ladybug', 'grasshopper', 'ant', 'beetle'
      return hobbies[16..19]
    when 'caterpillar', 'cricket', 'cockroach', 'scorpion', 'spider', 'centipede', 'millipede', 'earthworm', 'slug', 'snail'
      return hobbies[21..24]
    when 'octopus', 'squid', 'jellyfish', 'starfish', 'seahorse', 'crab', 'lobster', 'shrimp', 'clam', 'oyster'
      return hobbies[26..29]
    else
      return hobbies[31..-2]
    end
  end

end
