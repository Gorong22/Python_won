use sample_mflix


show collections

db.movies.find()

use test

show collections

db.daveshop.find({"category"})

db.daveshop.find({"category": {"$exists": true}})