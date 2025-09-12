//각 영화의 제목과 해당 영화에 달린 댓글을 출력해주세요 
use sample_mflix

db.comments.find()

db.movies.aggregate([
  {
    $group:{
      _id:"$title"
    }
  },
  {
    $lookup:{
      from:"comments",
      localField:"_id",
      foreignField:"movie_id",
      as:"word"
    }
  },
  {
    $project:{
      title: "$_id", word:"$word.text",_id:0
    }
  }
])

//평점이 가장 높은 영화의 제목과 평점을 출력해주세요 

db.movies.aggregate([
  {
    $addFields: {
      ratingNum: {
        $convert: {
          input: "$imdb.rating",
          to: "double",
          onError: null,
          onNull: null
        }
      }
    }
  },
  {
    $group: {
      _id: "$title",
      maxRating: { $max: "$ratingNum" }
    }
  },
  { $sort: { maxRating: -1 } },
  { $limit: 10 }
])

db.movies.aggregate([
  {$match:{"imdb.rating":{$ne:""}}},
  {$sort:{"imdb.rating": -1}},
  {$limit:1},
  {$proejct:{_id:0 , title:1, "imdb.rating":1}}


])

//각 장르별로 평균 평점이 가장 높은 장르와, 평균 평점을 출력해주세요 

db.movies.find()

db.movies.aggregate([
  {$unwind:"$genres"},
  {
    $group:{
      _id:"$genres",
      avg:{$avg:"$imdb.rating"}
    }
  },
  {$sort:{avg:-1}},
  {$limit:1}
])


//개봉 연도별 year  평균 러닝타임이 가장 짧은 영화의 개봉년도와 평균 러닝타임 
db.movies.find()
db.movies.aggregate([
  {
    $group:{
      _id:"$year",
      avgrun:{$avg:"$runtime"}
    }
  },
  {$sort:{avgrun:1}},
  {$limit:1}

])

//국가별로 가장 많은 영ㅇ화를 제작한 감독과, 그 감독의영화 개수를 출력 

db.movies.find()

db.movies.aggregate([
  { $unwind: "$countries" },
  { $unwind: "$directors" },
  {
    $group: {
      _id: "$countries",
      count:{$sum:1}
    }
  },

])

//풀이

db.movies.aggregate([
   {$unwind : "$countries"},
   {$unwind : "$directors"},
   {$group : {_id : {country : "$countries", director : "$directors"}, count : {$sum :1}}},
   {$sort : {count : -1}},
   {$group : {_id : "$_id.country", topDirector : {$first : "$_id.director"}, movieCount : {$first:"$count"}}}
])

db.movies.aggregate([
  {$unwind:"$countries"},
  {$unwind:"$directors"},
  {$group: {_id: {country: "$countries", director:"$directors"},count : {$sum :1}}},
  {
    $group: {
              _id:"$_id.country",
              top:{
                $topN: {
                  n: 1,
                  sortBy:{count:-1},
                  output: {director:"$_id.director", movieCount:"$count"}
                }
              }
      
      }
  
  },
  {
    $project:{
      _id:0,
      country:"$_id",
      topDirector: {$first:"$top.director"},
      movieCount: {$first:"$top.movieCount"}
    }
  }



])


//각 연도별로 가장 많은 평점을 받은 영화의 제목과 평점을 출력하세요 

db.movies.find()

db.movies.aggregate([

   {$group: {_id: {year: "$year", title:"$title"}}}

])


db.movies.aggregate([
  {$sort:{"year":1, "imdb.rating":-1}},
  {$group:{_id:"$year", title: {$first:"$title"}, maxRating:{$first:"$imdb.rating"}}},
  {$project: {_id: 0, year: "$_id", title:1, maxrating: 1}}
  
  
])

//각 장르별로 가장 많은 영화를 출력하세요 

db.movies.aggregate([
  { $unwind: "$genres" },
  {
    $group: {
      _id: "$genres",
      sum: { $sum: 1 }
    }
  },
  { $sort: { sum: -1 } },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      movieCount: "$sum"
    }
  }
])

//평균 평점이 가장 높은 감독과 해당 감독의 평균 평점을 출력해주세요 

db.movies.aggregate([
  {$unwind:"$directors"},
  {
    $group:{
      _id:"$directors",
      avgrun:{$avg:"$imdb.rating"}
    }
  },
  {$sort:{avgrun:-1}},
  {$limit:1},
  {$project:{_id:0, director: "$_id", avgrun:1}}
])

//장르별 평균 러닝타임 이 가장 긴 장르와, 해당 장르의 평균 러닝타임을 출력해줏에ㅛ 

db.movies.aggregate([
  {$unwind:"$genres"},
  {
    $group:{
        _id:"$genres",
         avg:{$avg:"$runtime"}
      
    }
  },
  {$sort:{avg:-1}},
  {$limit:1},
  {$project:{_id:0, genres:"$_id", avg:1}}


])

//각 영화의 제목과 해당 영화에 대해 댓글을 남긴 사용자들을 출력하세요 영화 제목, 유저들 

db.comments.find()

db.movies.aggregate([

  {
    $lookup:{
      from : "comments",
      localField:"_id",
      foreignField:"movie_id",
      as : "user"
      
    }
  },
  {$unwind:"$user"},
  {$project : {_id:0, title:1, "user.name":1}}


])


//종합실습문제 

db.users.find()

show collections


db.comments.find()


db.movies.find()

db.theaters.find()


db.comments.aggregate([
  
  {
    $lookup:{
      from : "users",
      localField:"text",
      foreignField:"name",
      as:"commentsCount"
    }
  },
  {
    $group:{
      _id:"$name",
      text:{$count:{"$text"}}
    }
  }
  


])

//각 사용자users 문서에 commentsCount 필드를 추가하여 댓글 개수를 계산하세요.

db.comments.find()

db.users.aggregate([
  // 1. users와 comments 컬렉션 조인
  {
    $lookup: {
      from: "comments",
      localField: "name",
      foreignField: "name",
      as: "userComments"
    }
  },
  {
    $addFields :{
     commentsCount :{$size:"$userComments"}
      
    }  
  },
  {
    $project:{_id:0, name:1, commentsCount:1}
  }
])
