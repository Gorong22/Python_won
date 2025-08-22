use starbucks_db;

show tables;

desc starbucks_products;


select * from starbucks_products;

use starbucks_db;

alter table starbucks_products modify column kcal int null;

ALTER TABLE starbucks_products
MODIFY COLUMN sodium INT NULL,
MODIFY COLUMN sugar FLOAT NULL,
MODIFY COLUMN protein FLOAT NULL,
MODIFY COLUMN fat_sat FLOAT NULL,
MODIFY COLUMN caffeine INT NULL;

desc starbucks_products;

select name, caffeine from starbucks_products
where caffeine >= 200
limit 10;

select name, protein from starbucks_products
where  protein >= 1
limit 10;


SELECT 
name, avg(caffeine) as 평균카페인, 
avg(protein) as 평균단백질, 
avg(kcal) as 평균칼로리 
from starbucks_products
where caffeine <= 300 and protein >= 10 and kcal <= 300
group by name;
