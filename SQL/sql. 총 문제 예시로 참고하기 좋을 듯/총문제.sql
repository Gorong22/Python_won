#1. category 테이블에서 comedy, sprots, family 카테고리의 category_id를 출력 해주세요 

select category_id, name from category
where name = 'Comedy' or name = 'Sports' or name = 'Family';


#2 film_category 테이블에서 카테고리 ID 별 영화 갯수 알아내기 

desc film_category;

select category_id, count(*) from film_category
group by category_id;


#3 category가 comedy인 영화 갯수 확인 및 출력 

desc film;

desc category;

select c.name, f.title, count(*) from film as f 
join film_category as fc on fc.film_id = f.film_id
join category as c on c.category_id = fc.category_id
where c.name = 'Comedy'
group by c.name, f.film_id, f.title
order by f.title;

SELECT c.category_id, c.name, COUNT(*) AS film_count
FROM film as f
JOIN film_category as fc ON fc.film_id = f.film_id
JOIN category as c ON c.category_id = fc.category_id
WHERE c.name = 'Comedy'
GROUP BY c.category_id, c.name;

#4. 카테고리가 comedy인 영화 갯수 확인 및 출력 (서브쿼리)

select count(*) from film as f 
where f.film_id in(
	select fc.film_id 
    from film_category as fc
	join category c on c.category_id = fc.category_id
	where c.name = 'comedy'
);


select count(*) from film_category
where category_id in(
	select category_id from. category
    where name = "Comedy"
);


select * from category;

#5. comedy, sports, familly 가각의 카테고리별 영화 수 확인하기 (join)

select c.category_id, c.name, count(*) from category as c
join film_category as fc using (category_id)
join film as f using (film_id)
where c.name in ('Comedy', 'Sports', 'Family')
group by c.category_id;


#6. 각 카테고리를 기준으로 영화 수가 70이상인 카테고리 명을 출력해라 

select c.name, count(*) from category as c 
join film_category as fc using (category_id)
join film as f using (film_id) 
group by c.category_id, c.name
having count(*) >= 70;

#7 각 카테고리에 포함된 렌탈 횟수 구하기 

# 필요한 테이블, 카테고리, 렌탈 
# 카테고리는 : 카테고리 ID -> 필름카테고리
# 렌탈은 rental_id, inventory_id, customer_id -> 페이먼트


select c.name, count(r.rental_id) from rental as r
JOIN inventory AS i ON r.inventory_id = i.inventory_id
JOIN film AS f ON i.film_id = f.film_id
JOIN film_category AS fc ON f.film_id = fc.film_id
JOIN category AS c ON fc.category_id = c.category_id
group by c.name
having count(r.rental_id);

select c.name, count(*) from category as c 
join film_category using(category_id)
join inventory using(film_id)
join rental using(inventory_id)
group by category_id;


#7 각 카테고리에 포함된 렌탈 횟수 구하기 

# 필요한 테이블, 카테고리, 렌탈 
# 카테고리는 : 카테고리 ID -> 필름카테고리
# 렌탈은 rental_id, inventory_id, customer_id -> 페이먼트

desc payment;
desc payment;
desc rental;
desc category;
desc film_category;

select r.rental_id, count(*) from rental as r
JOIN inventory AS i ON r.inventory_id = i.inventory_id
JOIN film AS f ON i.film_id = f.film_id
JOIN film_category AS fc ON f.film_id = fc.film_id
JOIN category AS c ON fc.category_id = c.category_id
group by c.category ,r.rental_id
having count(*);


#8 . comidy,sporys, family 카테고리에 포함되는 영화들의 렌탈 횟수 

select c.name, count(*) from rental as r
JOIN inventory AS i ON r.inventory_id = i.inventory_id
JOIN film AS f ON i.film_id = f.film_id
JOIN film_category AS fc ON f.film_id = fc.film_id
JOIN category AS c ON fc.category_id = c.category_id
where c.name in ('Sports', 'Comedy', 'Family')
group by c.category_id;


select count(*) from film as f 
where f.film_id in(
	select fc.film_id 
    from film_category as fc
	join category c on c.category_id = fc.category_id
	where c.name = 'comedy'
);

desc film;
desc inventory;
desc rental;
#9 카테고리가 comedy인 데이터의 렌탈 횟수 출력 하는데 서브쿼리 문법으로 

select count(*)
from rental
where inventory_id in (
	select inventory_id from inventory
    where film_id in (
    select film_id from film_category where category_id in(
    select category_id from category
    where name = 'comedy'
    )
    )
    
);

#10 address 테이블에는 address_id 있지만, customer 테이블에는 없는 
# 데이터의 갯수 

select count(*) from address as a
left join customer as c on c.address_id = a.address_id
where c.address_id is null;

select count(*) from address as a
right join customer as c on c.address_id = a.address_id
where c.address_id is null;

select count(*) from customer as c 
right join address as a on a.address_id = c.address_id 
where a.address_id is null;


use sakila;

show tables;

select count(*) from address; #603
select count(*) from customer; #599

select 
	count(address_id)
from address A
join customer C USING(address_id); 

#inner join 방식이라는데 뭐라는지 모르겠음 
select
	(select count(*) from address) -
	(select 
		count(address_id)
	from address A
	join customer C USING(address_id)) as no_customer_address;

#1+2=3

select count(*) as no_customer_address
from customer as C
RIGHT JOIN address AS A 
ON A.address_id = C.address_id
where customer_id is null;


#10 캐나다 고객에게 이메일 마케팅 캠페인을 진행하고자함,
# 캐나다 고객의 이름과 이메일 주소 리스트를 출력 alter

show tables;
desc category;



desc customer_list; 
desc country;
desc city;
desc addres;
desc address;
desc payment;
desc film;


select c.first_name, c.last_name, c.email from customer as c
join address as a using (address_id)
join city as ci using (city_id)
join country as ct  using (country_id)
where ct.country = 'canada';



select * from customer 
limit 10;

select country from country
where country = 'canada';


#11 신혼부부들 타겟고객들의 매출이 최근 저조해짐 가족 영화를 홍보 대상으로 
#삼고자 함, 가족 영화로 분류된 영화 리스트를 출력해주세요 

desc category;
desc film;
desc inventory;
show tables;
desc film_category;

select ct.name, f.title from film as f
join film_category as fc using (film_id)
join category as ct using (category_id)
where ct.name = 'Family';


#12 가장 자주 대여하는 영화 리스트를 참고로 보고 싶음 
# 가장 자주 대여하는 영화 순응로 100개만 뽑아라 제목, 렌탈 횟수 

desc film;
desc rental;
desc inventory;

select f.title, count(r.inventory_id) from film as f
join inventory as i using (film_id)
join rental as r using (inventory_id)
group by f.film_id
order by count(r.inventory_id) desc
limit 100;

select f.title, count(r.rental_id) from film as f
join inventory as i using (film_id)
join rental as r using (inventory_id)
group by f.film_id
order by count(r.rental_id) desc
limit 100;

#13 각 스토어별로 매출을 확인하고 싶습니다 스토어별. 
# 그러면 각 스토어들 기준으로 국가, 도시, 그리고 그 별로 총 매출이 필요하겠네요 
desc store;
select * from store;

desc address;
desc city;
desc country;
desc customer;
desc payment;

select CONCAT(ct.country, ", ",  ci.city) AS STORE, 
st.store_id as store_id, 
sum(pa.amount)  as total_sales 
from store as st
join address as a using (address_id)
join city as ci using (city_id)
join country as ct using (country_id)
join customer as cu using (store_id)
join payment as pa using (customer_id)
group by st.store_id;

#14 가장 렌탈 비용을 많이 지불한 상위 10명의 VIP 에게 선물을 주고자 함
# 해당 vip 고객들의 주소와 이메일 그리고 각 고객별 그동안 총 지불 비용을 출력해주세요 

select c.first_name, c.last_name, a.address, c.email, sum(p.amount) from customer as c
join address as a on a.address_id = c.address_id 
join payment as p on p.customer_id = c.customer_id 
group by c.customer_id
order by sum(p.amount) desc 
limit 10;

#15 actor 테이블의 배우 이름을 퍼스트네임과 라스트네임의 조합으로 출력해주세요 
# 단 소문자로 출력해주세요 actor_name이라는 필드명으로 출력 

select CONCAT(LOWER(first_name), "  ", LOWER(last_name)) AS actor_name 
from actor;

SELECT 
    CONCAT(
        UPPER(LEFT(first_name, 1)), 
        LOWER(SUBSTRING(first_name, 2)),
        " ",
        UPPER(LEFT(last_name, 1)), 
        LOWER(SUBSTRING(last_name, 2))
    ) AS actor_name
FROM actor;


#16 언어가 영어인 영화 중 영화 타이틀이 K와 Q 로 시작하는 영화의 타이틀만 출력해주세요 
show tables;
desc film;

select * from language;

select f.title from film as f
join language as l on l.language_id = f.language_id
where f.title like 'K%' or f.title like 'Q%' and l.name = 'English';

select title from film as f 
where f.language_id in(
	select l.language_id from language as l
	where f.title like 'k%' or f.title like 'Q%' and l.name='English'

);

#17 alone trip 이라는 영화에 나오는 배우 이름을 모두 출력하세요 단 배우 이름은 actor_name으로 출력 

desc film_actor;

select concat(a.first_name, " ", a.last_name) as actor_name from actor as a
where a.actor_id in(
	select fi.actor_id from film_actor as fi
    where fi.film_id in (
		select f.film_id from film as f
        where f.title = 'Alone Trip'
    )
);

#18 2005년 각 스태프 멤버가 올린 매출을 출력해주세요 staff 멤버의 필드명은 staff_member로,
# 매출 필드명은 total_Amount 

select payment_date from payment;

select concat(s.first_name, s.last_name) as staff_member, sum(p.amount) as total_Amount
from staff as s
join payment as p on p.staff_id = s.staff_id 
where extract(year from p.payment_date) = 2005
group by s.staff_id;



#20 각 카테고리 평균 영화 러닝타임이 전체 평균 러닝타임보다 큰 
#카테고리들의 카테고리 명과 해당 카테고리의 평균 러닝 타임을 출력하세요 

#desc category;
#desc film_category;

select c.name, avg(f.length) as film_length from category as c
join film_category as fc on fc.category_id = c.category_id 
join film as f on f.film_id = fc.film_id 
group by c.category_id, c.name 
having  avg(f.length) > (
	select avg(length) from film);


#21 각 카테고리별 평균 영화 대여 시간(기간?) 카테고리 명을 출력하세요 
#영화 대여 시간은 -> 영화 대여 및 반납 시간의 차이, hour를 단위로 사용 

#영화 대여 시간 => 영화 대여 및 바납 시간의 차이 

show tables;
desc inventory;
desc film_category;


select c.name, avg(timestampdiff(hour, r.rental_date, r.return_date)) 
from category as c
join film_category as f on f.category_id = c.category_id 
join inventory as i on i.film_id = f.film_id
join rental as r on r.inventory_id = i.inventory_id
group by c.name;

#22 새로운 임원이 부임했습니다. 총 매출액 상위 5개 장르의 매출액을 수시로 
# 확인하고자 합니다. 각 장르별 총 매출액(total Asales), 각 장르 이름(genre) 해당 데이터를 
#수시로 확인 할 수 있는 
#장치를 만드세요 장치 이름은 top5_genres로 만들어주시고, 총 매출액, 상위 5개 장르의 매출액이 
# 출력될 수 있도록 해달라 

desc category;
desc film_category;
desc inventory;
desc rental;
desc payment;
show tables;

create VIEW top5_genres AS
	select c.name as genre, sum(p.amount) as totalSales from category as c
	join film_category as fc on fc.category_id = c.category_id
	join inventory as i on i.film_id = fc.film_id
	join rental as r on r.inventory_id = i.inventory_id
	join payment as p on p.customer_id = r.customer_id 
	group by c.name 
	order by sum(p.amount) desc 
	limit 5;

select * from top5_genres;


drop view top5_genres;

#where extract(year from p.payment_date) = 2005
#23 2005년 5월에 가장 많이 대여된 영화 3개를 찾아주세요 영화 제목과 대여 횟수 

desc film;
desc film_category;
desc inventory;
desc rental;

select f.title, count(*) from film as f
join inventory as i on i.film_id = f.film_id
join rental as r son r.inventory_id = i.inventory_id 
where extract(year from r.rental_date) = 2005 
	and extract(month from r.rental_date) = 5
group by f.film_id
order by count(*) desc
limit 3;

# 24 대여된 적이 없는 영화를 찾으세요

show tables;
desc customer;
desc rental;
desc inventory;

select f.title from film as f 
LEFT JOIN inventory AS i ON i.film_id = f.film_id
LEFT JOIN rental AS r ON r.inventory_id = i.inventory_id
WHERE r.rental_id IS NULL;

SELECT f.title
FROM film AS f
WHERE f.film_id NOT IN (
    SELECT i.film_id
    FROM inventory AS i
    JOIN rental   AS r ON r.inventory_id = i.inventory_id
);

#25 각 고객의 총 지출 금액의 평균 보다 총 지출 금액이 더 큰 고객 리스트를 찾아라 
# 그들의 이름과 그들이 지출한 총 금액 지출 

desc customer;

desc payment;

SELECT 
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    SUM(p.amount) AS total_amount
FROM customer c
JOIN payment p ON p.customer_id = c.customer_id
GROUP BY c.customer_id
HAVING SUM(p.amount) > (
    SELECT AVG(total_amount) 
    FROM (
        SELECT SUM(p2.amount) AS total_amount
        FROM payment as p2
        GROUP BY p2.customer_id
    ) AS sub
);

#26 가장 많은 결제건을 처리한 직원이 누구이지 찾아보자 
show tables;

desc staff;

desc payment;

select s.staff_id, concat(s.first_name, " ", s.last_name) as 이달의_스폰지밥, count(p.payment_id) as 결제횟수 
from staff as s
join payment as p on p.staff_id = s.staff_id
group by s.staff_id
having count(p.payment_id);


#27 액션 카테고리에서 높은 영화 영상 등급을 받은 순으로, 상위 5개의 영화를 보여주세요 
#영상 등급 순으로의 정렬은 order by rating desc

show tables;

select rating from film
order by rating desc;

desc category;
desc film_category;
desc film;

select c.name, f.rating, f.title from film as f
join film_category as fc on fc.film_id = f.film_id
join category as c on c.category_id = fc.category_id
where c.name = 'action'
order by f.rating desc
limit 5; 


select distinct rating from film;

#28 각 영화영상등급의 영화별 대여기간의 평균을 찾아주세요

desc film;
desc inventory;

desc rental;

select f.rating, f.title, avg(f.rental_duration) from film as f
join inventory as i on i.film_id = f.film_id
join rental as r on r.inventory_id = i.inventory_id
group by f.rating, f.title;

#29 매장 id 별 총 매출을 보여주는 view 를 생성하세요

desc store;
desc customer;
desc payment;

create or replace view total_sales_by_store AS 
	select s.store_id, sum(p.amount) from store as s
	join customer as c on c.store_id = s.store_id
	join payment as p on p.customer_id = c.customer_id
	group by s.store_id;
    
    select * from total_sales_by_store;
    
    
# 문제 30 가장 많은 고객이 있는 상위 5개 국가를 보여주세용 

desc customer;
desc address;
desc city;
desc country;

select concat(c.first_name, " ", c.last_name), ct.country, count(*) from customer as c
join address as a on a.address_id = c.address_id
join city as ci on ci.city_id = a.city_id
join country as ct on ct.country_id = ci.country_id
group by ct.country_id, ct.country, c.customer_id, c.first_name, c.last_name
order by count(*) desc;

select ct.country, count(*) as total
from customer as c
join address as a on a.address_id = c.address_id
join city as ci on ci.city_id = a.city_id
join country as ct on ct.country_id = ci.country_id
group by ct.country_id, ct.country
order by total desc;