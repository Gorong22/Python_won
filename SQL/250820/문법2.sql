select title, rental_rate,
case 
	when rental_rate < 1 then "Cheap"
    when rental_rate between 1 and 3 then "Moderate"
    else "Expensive"
end as priceCategory
from film; 



#with를 사용해서, sakila 데이터베이스의 각 등급별 영화의 평균 길이를 알아보세요 

desc film;

with filmlength AS (
	select avg(length) from film
)
select f.rating filmlength from film AS f
group by rating;

WITH FilmLength AS (
  SELECT rating, AVG(length) AS avg_len
  FROM film
  GROUP BY rating
)
SELECT rating, avg_len
FROM FilmLength
ORDER BY rating desc;

select 


#case when 을 사용해서 customer 테이블의 고객들을 active 컬럼에 따라 
#active가 1일 경우 active 또는 1이 아니면 inactive로 분류 출력

desc customer;

select active from customer;

select customer_id, 
case 
	when active = 1 then "active"
    when active != 1 then "inactive"
    else "nope"
end as Active_1
from customer;

# with를 사용해서 sakila의 film 테이블에서 각 rating에 따른 
# 평균 rental_duration을 계산해보세요. 


with avg_duration as(
	select rating, avg(rental_duration) as duration from film
    group by rating
)
select rating, duration from avg_duration
order by rating desc;

#with를 사용해서 sakila의 payment 테이블에서 각 고객별 지불액을 계산하고 ,
#그 지불액에 따라 고객을 "low, medium, High" 로 분류하세요 
#분류기준 low = 0~50, Medium = 51 ~ 100, high : 100달라 초반 

desc payment;


with casebycase AS (
	select customer_id, round(sum(amount)) as sum, 
	case
	when sum between 0 and 50 then "low"
    when sum between 51 and 100 then "medium"
    else "high"
end as custmer_level
from payment
group by customer_id
)
select customer_id, sum, custmer_level
from casebycase
order by sum desc;

select * from customer;

select 
	c.customer_id, 
	CONCAT(c.first_name, " " ,c.last_name) as customer_name, 
	group_concat(f.title ORDER BY F.title asc separator "; ") AS rented_movies	
from customer as c
join rental as r using (customer_id)
join inventory as i using (inventory_id)
join film as f using (film_id)
group by c.customer_id
limit 10;

#각 배우가 출연한 영화들의 제목을 세미콜론(;)으로 구분하여 하나의 문자열로 출력하세요 
#결과에는 배우 ID, 배우이름, 출연영화 제목 리스트가 포함되도록 해주세요 

# actor, film 

desc actor; 
desc film;
desc inventory;
show tables;
desc category;

desc film_actor;

select 
	a.actor_id,
    concat(a.first_name, " ", a.last_name) as actor_name,
    group_concat(f.title ORDER BY f.title asc separator "; ") AS movie_title
from actor as a
join film_actor as fa on fa.actor_id = a.actor_id
join film as f on f.film_id = fa.film_id
group by a.actor_id, actor_name;

WITH filmography AS (
  SELECT 
    a.actor_id, 
    f.title
  FROM actor AS a 
  JOIN film_actor AS fa USING (actor_id)
  JOIN film AS f      USING (film_id)
)
SELECT 
  a.actor_id,
  CONCAT(a.first_name, ' ', a.last_name) AS actor_name,
  GROUP_CONCAT(fg.title ORDER BY fg.title ASC SEPARATOR '; ') AS movie_title
FROM filmography AS fg
JOIN actor AS a ON a.actor_id = fg.actor_id
GROUP BY a.actor_id, actor_name
ORDER BY actor_name;