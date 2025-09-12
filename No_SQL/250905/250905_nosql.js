db.comments.aggregate([

  {
    $lookup:
      {
        from: "movies",
        localField: "movie_id",
        foreignField: "_id",
        as: "movie"
      }
  }

])


db.users.find().limit(1)

db.comments.find().limit(1)

db.users.aggregate([
  {
    $lookup: {
      from: "comments",
      localField: "email",
      foreignField: "email",
      as: "comments"
    }
  }
])



db.movies.aggregate([
  { $match: { runtime: { $gte: 100 } } },
  { $sort: { year: -1 } },
  { $skip: 5 },
  { $limit: 3 }

])

db.movies.aggregate([
  {
    $facet: {
      movieCountByYear: [
        { $group: { _id: "$year", count: { $sum: 1 } } }
      ],
      maxRatingByYear: [
        { $group: { _id: "$year", maxRating: { $max: "$imdb.rating" } } }
      ]
    }
  }


])

db.movies.aggregate([
  {
    $redact: {
      $cond:{
        if: {$gte:["$imdb.rating",7]},  //조건식
        then: "$$KEEP",    //조건식이 참 ->사용자 정의 변수를 활용하고자 
        else: "$$PRUNE"    //조건식이 거짓
      }
    }
  }

])



db.movies.aggregate([
  {$match: {year:{$gte: 2010}}}



])