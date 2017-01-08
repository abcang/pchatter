# == Schema Information
#
# Table name: rooms
#
#  id         :integer          not null, primary key
#  name       :string           not null
#  pass       :string
#  user_id    :integer          not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class Room < ApplicationRecord
  acts_as_hashids length: 10

  belongs_to :user

  validates :name, presence: true, length: { maximum: 63 }
  validates :pass, length: { maximum: 63 }
  validates :user_id, presence: true
end
