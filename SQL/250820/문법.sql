USE SAKILA;

SHOW TABLES;

SELECT * FROM ACTOR
LIMIT 5;

SELECT first_name, last_name from actor
where actor_id < 100;


select * from ActorInfo;

create VIEW ActorInfo AS 
SELECT first_name, last_name from actor
where actor_id < 100;

create OR REPLACE VIEW ActorInfo AS 
SELECT first_name, last_name from actor
where actor_id < 100;

DROP VIEW ActorInfo;

create or replace view myview AS
select * from customer 
where customer_id=1;


select * from myview;

UPDATE customer 
SET first_name = "DAVID"
WHERE customer_id = 1;

UPDATE myview 
SET first_name = "MARY"
WHERE customer_id = 1;


#ActorInfo라는 VIEW를 만드세요. 해당 VIEW는 actor 테이블에서 
#first_name과 last_name 컬럼을 포함하고 있어야합니다 

create or replace view ActorInfo AS
select first_name, last_name from actor 
where actor_id < 50;

select * from ActorInfo;

#film 테이블에서 렌탈 비용이 2달러 보다 높은 영화에 대한 view를 만들어주세요 
# 해당 view의 이름은 ExpensiveFilm이고, title, rental_rate 컬럼만 포함해야합니다 

show tables;
desc payment;
desc film;
desc rental;


select * from film;

create or replace view ExpensiveFilm AS
select title, rental_rate from film 
where rental_rate > 2.00;

RENAME VIEW ExpensivFilM TO Expensive;


select * from ExpensiveFilm;

#이미 만든 VIEW 인 ActorInfo를 수정하여 actor_id가 100 미만인 배우만 포함하도록 수정 

CREATE OR REPLACE VIEW ActorInfo AS
SELECT actor_id, first_name, last_name
FROM actor
WHERE actor_id < 100;

#select count(*) from ActorInfo;

drop view ActorInfo;

drop view ExpendiveFilm;

SHOW FULL TABLES 
WHERE table_type = 'VIEW';

select * from inventory;

select * from film;

WITH FilmInventory AS (
	select distinct film_id from inventory
)
select F.film_id from film AS F
join FilmInventory as FI on F.film_id = FI.film_id; 