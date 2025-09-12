db.users.find()

db.users.updateOne(
  {name: "동현"},
  {$set:{name:"동현2세", age:31, hobbies:["축구","음악","영화"]}}

)
db.users.updateOne(
  {name:"유진"},
  {$unset: {age: 1}}

)

db.users.find({name:"유진"})

db.users.updateOne(
  {name:"민준"},
  {$set:{name:"민준", age:22, hobbies:["음악","여행"]}},
  {upsert:true}

)

db.users.find()

db.users.updateOne(
  {name:"유진"},
  {$set: {age: 30}}

)

db.users.updateOne(
  {name:"유진"},
  {$set: {hobbies: "운동"}}

)


db.users.updateOne(
  {name:"유진"},
  {$set: {hobbies: ["운동", "요리"]}}

)

db.users.updateOne(
  {name:"유진"},
  {$push: {hobbies: "영화"}}

)


db.users.find({name:"유진"})

db.users.updateOne(
  {name: "유진"},
  {$pull:{hobbies:"운동"}}

)

db.users.deleteMany(
  {address:"수원시"}

)

db.users.insertMany(
  [
    {name:"David", age:45, address:"서울"},
    {name:"DaveLee", age:25, address:"경기도"},
    {name:"Andy", age:50, hobby:"골프", address:"경기도"},
    {name:"Kate", age:35, address:"경기도"},
   
  
  ]


)

db.users.find()


db.users.deleteMany(
  {age:{$lt:30}}


)

db.users.insertMany(
  [
    {name:"A", age: 20, address:"경기도", data: ISODate("2025-08-15")},
    {name:"B", age: 30, address:"서", data: ISODate("2025-06-15")},
  
  ]

)

db.users.find()

db.users.updateMany(
  {address:"경기도"},
  {$inc:{age:1}}

)

db.users.deleteMany(

  {data:{$lt: ISODate("2025-09-01")}}
  
  )


db.users.find()


use customer_db


db.users.find()