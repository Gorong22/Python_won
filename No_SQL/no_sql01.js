//컬렉션 저장하기 (특정 옵션설)
db.createCollection(
    "log", {capped:true, size:5242880, max:5000}

)

/*
많은양의 글을 주석처리하고 싶을때 이렇게하면 됩니다요 
*/

//전체구문 실행 컨트롤 + 쉬프트 + 엔터 

show collections
db.log.isCapped()

db.log.renameCollection("test02")
