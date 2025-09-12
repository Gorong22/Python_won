use customer_db

db.createCollection("customer")

//데이터 삽입 고객 리뷰 10개를 reviews 컬렉션에 저장하기 

db.customer.insertMany(
  [
    {customer_name:"김건우", product:"jacket", rating:5, comment:"디자인도 좋고 퀄리티도 좋아요!", date:ISODate("2025-05-12")},
    {customer_name:"강성아", product:"pants", rating:2, comment:"사이즈가 생각보다 작아요ㅠ", date:ISODate("2025-04-10")},
    {customer_name:"이나연", product:"shose", rating:4, comment:"편하고 자주 신을 것 같아요", date:ISODate("2025-05-20")},
    {customer_name:"류도현", product:"bag", rating:1, comment:"마감이 많이 아쉽네요", date:ISODate("2025-06-02")},
    {customer_name:"이원실", product:"shirts", rating:3, comment:"색감이 너무 마음에 들어요", date:ISODate("2025-03-15")},
    {customer_name:"김슬", product:"cap", rating:5, comment:"향도 괜찮고 만족스러움", date:ISODate("2025-07-01")},
    {customer_name:"곽다희", product:"beauty", rating:4, comment:"생각보다 재질이 별로임", date:ISODate("2025-05-28")},
    {customer_name:"이시은", product:"outer", rating:2, comment:"무난하게 입을 수 있을 듯", date:ISODate("2025-06-18")},
    {customer_name:"김상우", product:"Tshirts", rating:3, comment:"핏이 너무 잘 나와서 좋아요", date:ISODate("2025-03-30")},
    {customer_name:"김보영", product:"pants", rating:5, comment:"그냥 평범한 청바지임", date:ISODate("2025-07-05")},
    
  
  ]

)
//데이터 조회 별점 4점이상, 특정 제품, 리뷰만 필터
db.customer.find(
  {rating:{$gte:4}},
  {product:1, comment:1, _id:0}

)


//한고객의 리뷰 코멘트를 배송이 빨라서 만족합니다 수정

db.customer.updateOne(
  {customer_name:"김건우" , product:"jacket"},
  {$set:{comment:"배송이 빨라서 만족합니다"}}

)

db.customer.find({customer_name:"김건우"})

//ratting 1점씩 추가 

db.customer.updateMany(
  {},
  {$inc:{rating:1}}

)

db.customer.find()

db.customer.updateMany(
  {customer_name:"강성아", product:"pants", customer_name:"이나연", product:"shose"},
  {$set:{date:"2023-05-02"}}


)

//1년 이상 된 리뷰 삭제  
db.customer.deleteMany(
  {date:{$gte:"2023-05-01"}}

)


