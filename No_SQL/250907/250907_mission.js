use sample_mflix

show collections

/*
1)각 사용자users 문서에 commentsCount 필드를 추가하여 댓글 개수를 계산하세요.
*/

db.users.aggregate([
{
   $lookup:{
     from:"comments",
     localField:"name",
     foreignField:"name",
     as:"userComments"     
   }
},
{
  $addFields:{
    commentsCount:{$size: "$userComments"}
  }
},
{
  $project:{_id:0,name:1, commentsCount:1}
}

])


/*
2) 댓글 길이 조건 처리
댓글(text) 길이를 기준으로
100자 이상 → "LONG COMMENT"
100자 미만 → "SHORT COMMENT"
          라는 새 필드(commentType)를 $cond로 추가하세요.
*/
db.comments.aggregate([

{
  $addFields:{
    commentType:{$strLenCP:{$ifNull:["$text",""]}}
  }
},
{
  $addFields:{
    commentType:{
      $cond:{
        if:{$gte:["$commentType",100]},
        then:"LONG COMMENT",
        else:"SHORT COMMENT"
      }
    }
  }
}



])

/*
3) Facet 분석
하나의 $facet으로 다음을 동시에 분석하세요.
최신 영화 TOP 5: year 내림차순 정렬 후 상위 5개
고평점 영화 개수: imdb.rating >= 8인 영화 수
장르별 영화 분포: genres를 $unwind 후 장르별 영화 수 집계
*/

db.movies.aggregate([
  {
    $facet: {

      Movie_Top5: [
        { $sort: { year: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, title: 1, year: 1 } }
      ],


      Top_rating: [
        { $match: { "imdb.rating": { $gte: 8 } } },
        { $count: "count" }
      ],


      genres: [
        { $unwind: "$genres" },
        { $group: { _id: "$genres", movieCount: { $sum: 1 } } },
        { $sort: { movieCount: -1 } }
      ]
    }
  }
])

/*
4) 사용자 활동 Facet 분석
하나의 $facet을 사용하여,
댓글이 가장 많은 사용자 TOP 3
평균 댓글 길이가 가장 긴 사용자 TOP 3
댓글이 없는 사용자 목록
을 각각 산출하세요.

*/
db.comments.aggregate([
  {
    $facet:{
      comments_king :[
        {$group:{_id:"$name", commentscount:{$sum:1}}},
        {$sort:{commentscount:-1}},
        {$limit:3}    
      ],
      longcomments_king :[
        {$group:{_id:"$name",avgComment:{$avg:{$strLenCP:{$ifNull:["$text",""]}}}}},
        {$sort:{avgComment:-1}},
        {$limit:3}
      ],   
     nocomments_user :[
       {
         $lookup:{
           from: "users",
           localField:"name",
           foreignField:"name",
           as:"comments"
         }
       },
       {
         $match:{$expr:{$eq:[{$size:"$comments"},0]}}
       },
       {
         $project:{_id:0,name:1}
       }              
     ]
    }
  }
])


/*
6) 극장 데이터 필터링
theaters 컬렉션에서 location.address.state = "CA"인 극장만 남기세요.
*/

db.theaters.aggregate([
  {
    $match: {
      $expr: { $in: [ "$location.address.state", ["CA"] ] }
    }
  }
])
