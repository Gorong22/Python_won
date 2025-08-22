#문제 3. 다음 문제를 MySQL 에서 SQL을 활용해 데이터를 출력하세요!
#1) 배우 성 검색 (LIKE)
#목표: 성(last_name)이 ‘%SON’ 으로 끝나는 배우의 actor_id, first_name, last_name 출력, 성 오름차순.

#actor id 소유 테이블 :  actor


use sakila;

show tables;

#desc actor

select actor_id, first_name, last_name
from actor 
where last_name like '%SON'
order by first_name ASC;

#2) 특정 등급 영화 조회
#목표: 영화 rating='PG-13' 인 영화의 film_id, title, rating 10개만, title 오름차순.


select film_id, title, rating from film 
where rating = 'PG-13'
order by title asc;


#3) 대여 가격 상위 정렬
#목표: rental_rate 내림차순 상위 15편의 film_id, title, rental_rate 조회.

select film_id, title, rental_rate
from film 
order by rental_rate desc
limit 15;

#4) 카테고리별 영화 수(기초 집계)
#목표: 카테고리 이름과(없으면 NULL) 영화 수를 구해 개수 내림차순 정렬.

#1. 카테고리와 필름의 접점이 없음, 두개를 조인 시킬 테이블을 찾아야함! 

#film_category 

show tables;

desc category;
#desc film_category;

select c.name as 영화장르, count(*) from category as c
join film_category as fc on c.category_id = fc.category_id
group by c.category_id;