use sakila;

desc customer;
desc rental;
desc inventory;


select 
c.customer_id as 고객번호,
date(r.rental_date) as 렌탈날짜, 
dense_rank () over (partition by c.customer_id order by r.rental_date desc ) as 대여순위,
lag(date(rental_date)) over (partition by c.customer_id order by rental_date) as 이전_대여일자,
lead(date(rental_date)) over (partition by c.customer_id order by rental_date) as 다음_대여일자,
first_value(date(rental_date)) over (partition by c.customer_id order by rental_date) as 처음_대여일자,
last_value(date(rental_date)) over (partition by c.customer_id order by rental_date
									rows between unbounded preceding and unbounded following)as 마지막_대여일자,
percent_rank() over (order by r.rental_id) as 백분위_순위,
cume_dist() over (order by r.rental_id) as 누적분포,
ntile(3) over (order by c.customer_id)as 그룹


from customer as c 

join rental as r using(customer_id)
join inventory as i using(inventory_id)
join film as f using(film_id)
order by r.rental_date asc;


#문제 풀이 

with RankedCustomers as (
	select 
		customer_id, first_name, last_name, active,
		ntile(3) over (order by active desc) as active_group
	from customer

)

select 
	customer_id, first_name, last_name, active, active_group,
    row_number() over (partition by active_group order by customer_id)
						AS group_row_number
from customer;


#영화 대여 내역에서 고객별 대여순서 출력,
#이전 대여와의 간격 day 단위 기준 정보 출력, 첫번째 대여일시 출력 
# 위 3가지를 포함한 내역을 출력해주세요 
# 추가적으로 customer_id, rental_id, rental_date, rental_order, preview_rental_gap, first_rental_date 
desc rental;

select
	row_number() over (partition by c.customer_id order by r.rental_date) as rental_order,
	c.customer_id, 
    r.rental_id,
    date(r.rental_date),
    lag(day(rental_date)) over (partition by c.customer_id order by r.rental_date) as preview_rental_gap,
    first_value(rental_date) over (partition by c.customer_id order by r.rental_date) as first_rental_date
    from customer as c 
    join rental as r using(customer_id);
    

#풀이 

select 
	customer_id, rental_id, rental_date,
    row_number() over (partition by customer_id order by rental_date)
						as rental_order,
	#일정차이 계산하는 함수
    datediff(
		rental_date,
        lag(rental_date) over (partition by customer_id order by rental_date)
    ) as prev_rental_app,
    
    first_value(rental_date) over (partition by customer_id order by rental_date)
									as first_rental_date


from rental;

#6 각 고객의 결제 금액에 따른 순위(결제금액이 높은 순으로 정렬, 만약 동일한 값이 존재하는 경우)
#같은 순위를 부여하지만, 다음 순위는 건너뛰지 않는다, 추력하고 백분위 순위 결제금액이 높은 순으로 출력 2개 출력 

desc payment;

select 
	customer_id,
    sum(amount),
    dense_rank () over (partition by customer_id order by amount desc ) as 결제금액순위,
    percent_rank() over (order by amount desc) as 백분위_순위
from payment;

#풀이 
WITH payment_info AS (
    SELECT 
        customer_id, 
        SUM(amount) AS total_amount
    FROM payment
    GROUP BY customer_id
)
SELECT 
    customer_id, 
    total_amount,
    DENSE_RANK() OVER (ORDER BY total_amount DESC) AS total_amount_rank,
    PERCENT_RANK() OVER (ORDER BY total_amount DESC) AS total_amount_pct_rank
FROM payment_info;

#7 각 등급별로 영화를 대여기간에 따라 4개의 그룹으로 나누고, 각 그룹내에서 
# rental_duration이 높은순으로 영화를를 출력해주세요 
# 출력값은 film_id, title, rating, rental_duration, rental_duration_group, group_row_number

desc film;

select 
	film_id,
    title,
    rating,
    rental_duration,
    ntile(4) over (partition by rating order by rental_duration desc) as rental_duration_group,
    row_number() over (partition by rental_duration order by rental_duration)
						as group_row_number
from film;


#풀이 
with filmGroups as (
select 
	film_id, title, rating, rental_duration,
    ntile(4) over (partition by rating order by rental_duration desc) as rental_duration_group
from film
)
select 
	film_id, title, rating, rental_duration, rental_duration_group,
    row_number() over (partition by rental_duration_group order by rental_duration)
						as group_row_number
from filmGroups;


#8 각 배우의 출연 영화 수에 따른 누적 분포를 다음 정보와 함께 출력해주세요 
#actor_id, first_name, last_name, film_count, film_count_cume_dist

desc actor;
desc film_actor;
desc film;

WITH actor_counts AS (
    SELECT 
        fa.actor_id,
        CONCAT(a.first_name, " ", a.last_name) AS 배우이름,
        COUNT(fa.film_id) AS 영화수
    FROM actor AS a
    JOIN film_actor AS fa USING(actor_id)
    GROUP BY fa.actor_id, a.first_name, a.last_name
)
SELECT 
    actor_id,
    배우이름,
    영화수,
    CUME_DIST() OVER (ORDER BY 영화수 DESC) AS 누적분포
FROM actor_counts;
    