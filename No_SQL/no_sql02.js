db.createCollection("users")

db.users.insertOne(
    {subject: "coding", author: "wonsil", vieews: 50}

)

db.users.find()