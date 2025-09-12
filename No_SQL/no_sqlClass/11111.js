use sample_mflix

db.movies.find()
db.comments.find()


db.movies.aggregate(
  [
    {$match: {year:1995}}
  
  ]

)

db.comments.aggregate(

  [
    {
      $group: {
        _id: "$movie_id", //$를 붙이면 그룹바이처럼 중복된 칼럼명 제외하고 하나씩다 볼 수 있음 만약 안붙이면 그냥 통으로 보여줌 _id는 변경 불가 에러남 
        commentcount:{$sum:1} //comment count는 내가 임의로 지정한 칼럼명임 앞에 코멘트는 그냥 내가 맘대로 할 수 있
      }
    },
    {
      $project:{
        year:"$_id",
        commentcount: 1,
        _id:0
        
      }
    }
  
  ]


)


db.movies.aggregate([

  {
    $group: {
      _id: "$year",
      runtime: {$avg: "$runtime"} //$는 목록화 하는거임 그래서 평균갑을 구할때는 목록화 해서 평균값을 구해라 라고 해야
     //openMovies:{$sum: 1}
    }
  }
  
  
])

db.movies.find().limit(2)

db.movies.aggregate([
  {
    $group :{
      _id:"$year",
      minRating:{$min:"$imdb.rating"}, //"5.2" <- min은 자동 형변환이 
      maxRating:{$max:"$imdb.rating"} // 4.8 + "5.2" <-max는 그게 불가능함 
      //averageRating: {$avg: "$imdb.rating"}
    }
  }

])

db.movies.aggregate([
  {
    $group: {
      _id: "$year",
     title: {$push: "title"} //안됨.. 당해년도에 개봉한 수많은 영화들을 배열로 완성 시키라는 $push 명령어 써야 넣어 라고 해줘야 알아들음
    }
  }

])

db.movies.find(
  {"imdb.rating": ""}

).limit(5)

db.movies.aggregate([
  
  {
      $addFields : {
      ratingNum: {
        $convert : {
          input: "$imdb.rating",
          to : "double", //input 값을 실수형으로 변환 ex ) "8.4" -> 8.4로 변
          onError : null, //"","8.4" ->null로 취급해
          onNull: null // 진짜 null -> null
        }
      }
    }  
  },
    {
      $match: { ratingNum : {$ne:null}} //숫자로 변환된 값만 찾아오겠다 
    },
    {
      $group : {
        _id: "$year",
        minRating: {$min:"$ratingNum"},
        maxRating: {$max:"$ratingNum"},
      }
    }
  

])

db.movies.find()

db.movies.aggregate([
  {
    $group: {
      _id:"$year",
      directers: {$push:"$directors"} //기존 데이터가 배열으 ㅣ형태 => 다시 배열 
    }
  }

])

db.movies.aggregate([
  {
    $group: {
      _id:"$year",
      directers: {$addToSet:"$directors"} //기존 데이터가 배열으 ㅣ형태 => 다시 배열 
    }
  }

])




db.movies.aggregate([
  {$unwind:"$genres"},
  {
    $group:{
      _id:"$year",
      genres : {$addToSet:"#genres"}
      //객체지향언어 => set함수 => 중복되는 값을 제거하고, 1번만 값을 가져오는 함수 
    }
  }

])

db.movies.aggregate([
  {
    $unwind: "$genres"
  },
  {
    $group: {
      _id: "$year",
      genres: { $addToSet: "$genres" }
    }
  }
])

db.movies.aggregate([
  {
    $group:{
      _id: "$year",
      firstMovie : {$first:"$title"},
      lastMovie : {$last:"$title"},
      
    }
  }


])

db.movies.aggregate([
  {
    $group:{
      _id: "$year",
      avgTitleLength:{$avg: {$strLenCP: {$toString:"$title"}}}
      
      
    }
  }


])



db.movies.aggregate([
  {
    $match: { year: { $gte: 2000 } }
  },
  {
    $count: "movies_since_2000"
  }
])

db.movies.find().limit(5)

db.movies.aggregate([
  {$sort:{"year":1, "title":1}},
  {$limit: 10}


])


db.movies.aggregate([

  {$limit : 5}

])

db.movies.aggregate([
  {$sort:{"imdb.rating":1}},
  {$limit:5}
])

//2000년 이후로 출시된 영화(year) 의 수는 몇개인가요 

db.movies.aggregate([

   {$match:{"year" : {$gte: 2000}}},
   {$count: "movies_since_2000"}

])

//각 연도별로 출시된 영화의 개수는 얼마일까요 

db.movies.aggregate(
  [
    {
      $group : {
        _id: "$year",
        movies:{$sum:1}
     }
    },
         {
        $sort:{_id:1}
     }
      
  
  ]

)

db.movies.aggregate([
  {
    $group: {
      _id: "$year",
      movies: { $sum: 1 }
    }
  },
  {
    $sort: { _id: 1 }
  }
])


//가장 많은 영화가 출시된 연도는 언제일까 

db.movies.aggregate([
  {
    $group: {
      _id: "$year",
      count: { $sum: 1 }
    }
  },
  {$sort: {count: -1}},
  {$limit: 1}
])

// 각 연도별, 평균 영화 러닝타임은? 

db.movies.find()

db.movies.aggregate(
  [
    {
      $group:{_id:"$year", avg_runtime: {$avg:"$runtime"}}
    },
    {$sort:{avg_runtime:-1}}
   
  
  ]


)

//가장 러닝타임이 긴 영화는 어떤 영화인가요 

db.movies.find()

db.movies.aggregate(
  [
    {
      $group:{
        _id:"title" , 
        max : {$max:"$runtime"}
      }
      
    },
    {limit : 1}
    
  
  
  ]
 


)

db.movies.aggregate([
  {
    $group: {
      _id: "$title",
      max_runtime: { $max: "$runtime" }
    }
  },
  {
    $sort: { max_runtime: -1 } // Sort by max_runtime in descending order
  }
])


//각 영화 장별 평균 평점 

db.movies.aggregate(
  [
    {
      $unwind : "$genres"
    },
    {
      $group:{
        _id: "$genres",
        avg: {$avg:"$imdb.rating"}
      }
      
    },
    {
     $sort: {avg:-1}
    }
  
  
  
  ]



)


//각연도별 영화 제목의 평균 길이를구하세요 

db.movies.find()

db.movies.aggregate([
  {
    $group: {
      _id: "$year",
      avg_title_length: { $avg: { $strLenCP: {$toString:"$title"} } }
    }
  }
])


//각연도별 가장 먼저 출시된 영 화 제목 


db.movies.aggregate([
  {$group:{_id:"year", firstMovie : {$first:"$title"}}}
])















/*
movies 컬렉션에서 영화 제작(*year)이 2010년 이상이고, 
장르에 "Action"이 포함된 영화의 title, year, genres를 조회하세요.
*/

show collections
db.movies.find()

db.movies.aggregate([ 
  {
    $match:{year:{$gte:2010},genres:"Action"}
    },
  {$project:{title:1,year:1,genres:1}}
])


//풀이 

db.movies.find()

//1. find 함수 사용 
db.movies.find(
  {year:{$gte:2010}, genres:"Action"},
  {_id:0, title:1, year:1, genres:1}
)

//2.aggregate사용 

db.movies.aggregate(
  [
    {$match: {year:{$gte:2010}, genres:"Action"}},
    {$project:{_id:0, title:1, year:1, genres:1}}
  
  ]

)




/*
새로운 고객 "홍길동"을 users 컬렉션에 추가하세요.
이메일은 "hong@test.com", 관심 장르는 ["Action", "Comedy"]입니다.
*/

db.comments.find()
db.users.find()
db.users.find()

db.users.insertOne({
  name:"홍길동",
  email: "hong@test.com",
  genres :["action", "comedy"]
  

})

db.users.find({name:"홍길동"})

//2.풀이

db.users.find()

db.users.insertOne({
  name:"이원실",
  email:"wonsil@test.com",
  password:"test123",
  preference:["Action", "Comedy"],
  createdAt: new Date(),
  
})


//새로운 방법 

db.users.aggregate(
  [
    {$documents: [
      {
        name:"이형원",
        email:"won@test.com",
        password:"test123",
        preference:["Action", "Comedy"],
        createdAt: new Date()
      }
     ]},
     {$merge:{into: "uesrs"}}
  
  ]

)

/*
comments 컬렉션에 "홍길동"이 "Action 영화 최고!"라는 댓글을 삽입하세요.
이후 "홍길동"의 댓글 내용을 "Action 영화 진짜 재밌다!"로 수정하세요.
*/

db.comments.insertOne({
  name:"홍길동",
  email:"hong@test.com",
  text:"Action영화 최고"
})

db.comments.find({name:"홍길동"})

db.comments.updateOne(
  {name:"홍길동"},
  {$set:{text:"Action 영화 진짜 재밌다!"}}

)

db.comments.find({name:"홍길동"})

//3.풀이 

db.comments.find().limit(5)

db.comments.find({}, {movie_id:1})

db.comments.insertOne({
  name:"이원실",
  email:"wonsil@test.com",
  movie_id: "573ad13adf29313caabd2b765",
  text: "주인과 산책장면이 너무 감동적이었어요",
  date: new Date(),
  
})

db.comments.find({name:"이원실"})

const  m = db.movies.findOne(
  {year:{$gte:2010}, genres:"Action"},
  {_id:1, title:1}
)

m._id

db.comments.insertOne({
  name:"이원실",
  email:"wonsil@test.com",
  movie_id: m._id,
  text: "주인과 산책장면이 너무 감동적이었어요",
  date: new Date(),
  
})

db.comments.find({name:"이원실"})

db.comments.updateOne(
  {email:"wonsil@test.com", movie_id: m._id},
  {$set : {text:"산책영화 진짜 재밌다", editedAt: new Date()}} 
  
)



/*
movies 컬렉션에서 장르별 영화 수를 집계하고, 
가장 많은 3개 장르를 출력하세요.
*/
db.movies.aggregate([
  {$unwind:"$genres"},
  {
    $group:{_id:"$genres", genrecount:{$sum:1}}

  },
  {$sort:{genrecount:-1}},
  {$limit:3}

])

//4.풀

db.movies.aggregate([
  {$unwind:"$genres"},
  {$group: {_id: "$genres",count:{$sum: 1}}},
  {$sort: {count:-1}},
  {$limit:3}


])


/*
movies 컬렉션에서 평점이 8.5 이상인 영화의
 title, imdb.rating, year를 출력하고, 
 최신 영화 순으로 정렬하세요.
*/
db.movies.aggregate([
  {$match:{"imdb.rating":{$gte:8.5}}},
  {$project:{title:1, "imdb.rating":1, year:1}},
  {$sort: {year:-1}}

])

//풀이 

//find 활요 
db.movies.find(
  {"imdb.rating":{$gte: 8.5}},
  {_id:0, title:1, year:1, "imdb.rating":1}
 
).sort({ year: -1 })


//aggregate 활용 

db.movies.aggregate([
  {$match : {"imdb.rating":{$gte:8.5}}},
  {$project:{_id:0, title:1,year:1,"imdb.rating":1}},
  {$sort:{year:-1}}


])

/*
comments에서 *사용자(email 기준)*별 총 댓글 수, 
댓글 평균 길이를 집계하고, 총 댓글 수 내림차순 → 평균 길이 내림차순으로 정렬하여
상위 5명을 출력하세요. 
*/

db.comments.find()
db.comments.aggregate([
  {
    $group:{_id:"$email", comment_avg : {$avg: {$strLenCP:"$text"}}}
  },
  {$sort:{comment_avg:-1}},
  {$limit:5}


])

//풀이 

db.comments.aggregate([

  {
    $addFields :{

      textLen: {$strLenCP:{$ifNull:["$text", ""]}}
    }
  },
  {
    $group: {
      _id: "$email",
      totalComments:{$sum:1},
      avgTextLength: {$avg:"$textLen"}
    }
  },
  {
    $sort:{
      totalComments: -1,
      avgTextLength: -1
    }
  },
  {
    $limit: 5
  }
])








