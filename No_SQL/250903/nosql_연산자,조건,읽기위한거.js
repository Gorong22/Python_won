//로컬컴퓨터 내 DB 목록 확
show dbs

//특정db에 접속 
use funcoding

use nosql91

show collections

//특정 db안에 컬렉션을 보고자 할 떄 
show collections

//특정 컬렉션안에 데이터를 확인하고자 할 때 
db.test.find()

//특정 db의 상태정보를 확인할 때 
db.stats()

//특정db 삭제 하는 방법 
//db가 삭제 된다는 것은 컬렉션도 같이 삭제가 된다는 의미
//컬렉션을 먼저 지우고 db를 삭제하는 순서로 합시다 
db.dropDatabase()

use funcoding

//특정 db안에 컬렉션 드랍하기 
db.test.drop()

//컬렉션을 cli 방식으로 create 
db.createCollection("test")

use funcoding

db.createCollection("test")

//컬렉션을 생성하는 2가지 방식 

/*

1) 특정 옵션 없이 단순 컬렉션 생성 방식  
2) 별도의 옵션을 설정해서 컬렉션 생성 방식
-capped : true (false는 Defalt)->고정된 크기의 컬렉션을 갖도록 하겠다는 의미 
-size : byte의 단위로 입력하게끔 되어 있음 
-max : 해당 컬렉션 안에 저장할 수 있는 데이터 = 문서 (몇개의 문서를 허용할 것인) 
*/


db.createCollection("log", {
   capped:true,
   size: 5242880,
   max: 5000
    
    
})

show collections

db.log.isCapped()
db.test.isCapped()

//이미 생성된 컬렉션 이름을 수정하고자 할떄 사용해야할 명령어 
db.log.renameCollection("test02")

show collections

//db >> collection >> documnet

db.createCollection("users")

show collections

db.users.insertOne(

    {
      subject:"coding",
      autohr:"funcoding",
      views : 50  
        
    }

)

db.users.find()


db.users.insertMany(
    [
        {subject: "coffee", author:"xyz", views:50},
        {subject: "shopping", author:"esx", views:100},
        {subject: "baking a cake", author:"asx", views:200},
        {subject: "baking", author:"fds", views:80},
        {subject: "cafe", author:"qwe", views:20},
        
    
    
    
    ]



)

db.users.find()

db.createCollection("users2", {
    validator:{
        $jsonSchema:{
            bsonType: "object",
            required: ["subject", "author", "views"],
            properties : {
                subject:{
                    bsonType: "string", 
                    description : "must be a string and is required"
                },
                author:{
                    bsonType: "string", 
                    description : "must be a string and is required"
                },
                views:{
                    bsonType: "int", 
                    description : "must be a integer and is required"
                },
            }
        }
    },
    validationAction: "error"
    
})

db.users.drop()

db.createCollection("users")


db.createCollection("users", {
    capped:true,
    size : 100000
})

db.users.find()

show collections

db.users.insertMany(
    [
    {name:"david", age:45,address:"서울"},
    {name:"dave", age:25, address:"경기도"},
    {name:"andy", age:50, hobby:"골프", address:"경기도"},
    {name:"kate", age:35, address:"수원시"},
    ]
)

db.users.find()

db.users.updateMany(
  { age: { $type: "string" } },   // age가 문자열인 경우만
  [
    { $set: { age: { $toInt: "$age" } } }
  ]
)

db.users.find({name:"david"})

db.users.find({},{name: 1}, {address:1})

db.users.find({age:{ $gte: 20}})

//find() : 해당 컬렉션 안에 있는 모든 데이터를 읽기 위한 목적의 함
db.users.find()

db.users.find({},{_id:0, name:1, address:1})

db.users.find({address:"서울"})


/*
특정, 조건에 해당되는 값을 찾아오고 싶다면 

*/

db.users.find()

db.users.find(

{age:{$gt:60}},
{name:1, address:1, age:1, _id:0},


)

//users Collection에서 이름이 dave인 문서의 name, age, address, _id를 출력한다면 

db.users.find(
    {name:"dave"},
    {name:1, age:1, address:1},

)

db.users.find(
    {name:"kate"},
    {name:1,age:1, address:1,_id:0}
)

db.users.find(
    {age:{$gt:25, $lte:50},hobby:"골프"}
)

db.users.find(
    {age: {$in:[45,50]}}
)

db.users.find(
    {age: {$nin:[45,50]}}
)

db.users.find(
    {age: {$nin:[25]}}
)

db.users.find(
    {age: {$ne:25}}
)

db.users.find(
    {age: {$nin:45,50}}
)

/*
1.age가 20보다 큰 문서의 name만 출력하기 
2.age가 50이고, address가 경기도인 문서의 name만 출력 
3.age가 30보다 작은 문서의 name과 age 출

*/

db.users.find(
    {age:{$gt : 20}},
    {name:1, _id:0}

)

db.users.find(
    {age:{$eq:50}, address:"경기도"},
    {name:1,_id:0}

)

db.users.find(
    {age:50, address:"경기도"},
    {name:1,_id:0}

)

db.users.find(
    {age:{$lt:30}},
    {name: 1, age:1, _id:0}

)

db.users.find()

db.users.insertOne({
    name :"brown",
    age:8,
    address:"서울"
    
    
})


db.users.find(
    {$and:[{address:"서울"}, {age:45}]}

)

// name이 브라운이거나, age가 35인 모든 값 출력 

db.users.find(
    {$or:[{name:"brown"}, {age:35}]}
)

db.users.find(
    {name:{$regex:/da/}}

)


db.users.find(
    {address:"경기도"}

).sort({age:1})

db.users.find().sort({age:-1})


//현재 컬렉션 내 문서의 개수를 확인하고자 할 때 : coun

db.users.find().count()

db.users.count(
    {address:{$exists:true}}

)

db.users.find(
    {address:{$exists:true}}

).count()

db.users.find(
    {address:{$exists:false}}

).count()


db.users.distinct("address")
db.users.find().limit(1)

//이미 생성도니 콜렉션안에 값 추가 

db.users.insertMany(
    [
        {name:"유진", age: 25, hobbies: ["독서", "영화", "요리"]},
        {name:"동현", age: 30, hobbies: ["축구", "음악", "영화"]},
        {name:"혜진", age: 35, hobbies: ["요리", "여행", "독서"]},
    
    
    ]


)

db.users.find()


use funcoding


db.users.find(
    {hobbies:{$all:["축구","음악"]}}

)

//age가 40보다 큰 문서의 address를 수원시로 변경하기

db.users.updateMany(
    {age:{$gt:40}},
    {$set:{address:"수원"}}

)

db.users.find(
)

db.users.updateOne(
    {name:"유진"},
    {$set:{age:26}}

)


