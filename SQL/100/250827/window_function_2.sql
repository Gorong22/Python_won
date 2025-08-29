select 
	customer_id,
    rental_date,
    count(*) over (partition by customer_id order by rental_date) as count
from rental;

#고객별 대여 날짜별 누적 대여 횟수 계산 

select 
	customer_id,
	rental_date,
	count(*) over (partition by customer_id order by rental_date
					rows between unbounded preceding and unbounded following) counts
from rental; 


select 
	customer_id,
	rental_date,
	count(*) over (partition by customer_id order by rental_date
					rows between 1 preceding and 1 following) counts
from rental; 

select
	r.customer_id,
	r.rental_date,
	p.amount,
    DATE(r.rental_date),  
   sum(p.amount) over (partition by r.customer_id order by rental_date
						rows between unbounded preceding and current row ) as sample
from payment as p
join rental as r using(rental_id);


select
	r.customer_id,
	r.rental_date,
	p.amount,
    avg(p.amount) over (partition by r.customer_id order by rental_date
						rows between unbounded preceding and current row ) as sample
from payment as p
join rental as r using(rental_id);

select
	r.customer_id,
	r.rental_date,
	p.amount,
    DATE(r.rental_date),  
   sum(p.amount) over (partition by r.customer_id order by date(rental_date)
						range between unbounded preceding and current row ) as sample
from payment as p
join rental as r using(rental_id);

select
	i.film_id,
	p.amount,
    p.payment_date,
    sum(p.amount) over (partition by i.film_id order by p.payment_date
						rows between unbounded preceding and current row) as revenue
from payment as p
join rental as r using(rental_id)
join inventory as i using(inventory_id);

# 장르별 영화 대여 수익 
#영화 장르의 수익성 분석이 필요합니다
#영화 장르별 대여 수익의 누적합계와 전체 대여 수익 대비 비율을 출력해주세요 


# rental_id// inventory_id //film_id//category_id


# with => 장르당 총 합계 매출 금액 
-- 1) 장르별 매출 합계를 집계하는 서브쿼리 (CTE)
WITH genre_revenue AS (
    SELECT 
        c.name AS genre,          -- 장르명
        SUM(p.amount) AS revenue  -- 해당 장르 전체 매출
    FROM payment AS p
    JOIN rental      USING(rental_id)     -- 결제 -> 대여
    JOIN inventory   USING(inventory_id)  -- 대여 -> 인벤토리
    JOIN film_category AS rc USING(film_id) -- 인벤토리 -> 영화 카테고리
    JOIN category    AS c  USING(category_id) -- 카테고리 테이블
    GROUP BY c.name
)

-- 2) 장르별 매출 데이터에 대해 다양한 분석값 계산
SELECT 
    genre,     -- 장르명
    revenue,   -- 장르별 총 매출

    -- 누적 매출 (내림차순 순서대로)
    SUM(revenue) OVER (
        ORDER BY revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS revenue2,

    -- 각 장르 매출이 전체 매출에서 차지하는 비율
    revenue / SUM(revenue) OVER() AS revenue_ratio

FROM genre_revenue;

select 
	rental_id,
    rental_date,
    LAG(rental_id, 1, 0) over (order by rental_date) as prev_rental,
    lead(rental_id, 1, 0) over (order by rental_date) as next_rental
from rental;

select 
	i.film_id,
    r.rental_date,
    first_value(r.rental_date) over (partition by i.film_id order by r.rental_date),
    last_value(r.rental_date) over (partition by i.film_id order by r.rental_date)
									
from rental as r
join inventory as i using(inventory_id);

select 
	i.film_id,
    r.rental_date,
    first_value(r.rental_date) over (partition by i.film_id order by r.rental_date),
    last_value(r.rental_date) over (partition by i.film_id order by r.rental_date
									rows between unbounded preceding and unbounded following)
from rental as r
join inventory as i using(inventory_id);

#Sakila DB를 참고해서, 가장 많은 영화를 대여한 고객
#(*단,  가장 많은 영화의 기준 -> 동일한 영화를 반복해서 대여한 경우의 수는 제외, 
#오직 서로 다른 영화를 대여했다는 기준으로만) 을 찾아내고, 
#해당 고객이 대여한 영화 갯수를 찾아주세요. 
#또한 해당 고객이 대여한 영화가 가장 많이 속한 카테고리
#(*단, 이때에는 동일한 영화를 반복해서 대여한 경우의 수도 포함)도 찾아주세요.

desc customer;
desc rental;

select c.first_name, c.last_name, count(*) from customer as c
join rental as r using(customer_id)
group by c.customer_id
having max(rental_id);

desc inventory;

select c.first_name, c.last_name, count(distinct i.film_id) from customer as c 
join rental as r using(customer_id)
join inventory as i using(inventory_id)
join film as f using(film_id)
where c.first_name = 'mary' and c.last_name = 'smith'
group by c.customer_id;

desc category;
desc film_category;

select distinct ca.name, count(i.film_id) from customer as c 
join rental as r using(customer_id)
join inventory as i using(inventory_id)
join film as f using(film_id)
join film_category as fc using(film_id)
join category as ca using(category_id)
where c.first_name = 'mary' and c.last_name = 'smith'
group by category_id
order by count(i.film_id) desc
limit 1;