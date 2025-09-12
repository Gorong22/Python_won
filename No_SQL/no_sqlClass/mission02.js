db.movies.find()

show collections

use sample_mfilx

show collections

//movies 컬렉션에서 영화 제작이 2010년 이상이고 장르에 Action이 포함된 영화의 
// title, year,genres를 조회 

use sample_mflix
db.movies.find()
db.movies.aggregate([
  { $unwind
    $match:{"year":{$gte:2010}, }
  }
  
  
  
  
 ])