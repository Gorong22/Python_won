#각 고객별 결제 금액에 따른 순위를 출력해주세요 
# 고객ID, rentalID, 고객의 결제 금액에 따른 순위 
# 순위를 출력할 때, 동일한 값이 있을 경우, 순위를 부여하고, 다음 순위는 건너뛰지 않습니다 

desc customer;
desc rental;
desc payment;

select 
	customer_id,
    rental_id,
    amount,
    dense_rank() over (partition by customer_id order by amount desc)
from payment;


#고객별 대여날짜, 시간 순으로 정렬 후 아래 내용을 출력해주세요 
#고객ID, rental_id, 대여날짜 시간, 해당 대여날짜 시간을 기준으로 다음 대여 날짜 시간

desc rental;

select 
	customer_id,
    rental_id,
    date(rental_date),
    lead(date(rental_date)) over (partition by customer_id order by date(rental_date))
from rental;

#각 등급별로 대여기간이 가장 긴 영화의 제목을 출력하세요 

desc rental;
desc customer;
desc film;


select
	
	distinct rating,
	first_value(title) over (partition by rating order by rental_duration desc)
from film;

# 각 고객을 활동상태가 높은 순으로 정렬하고, 이를 기준으로 3개의 그룹으로 나누세요 
# 그룹 내 고객의 순서를 customer_id 가 낮은 순으로 정렬해주세요 
# 정렬 후 행 번호를 매겨주세요 
# customer_id, first_name, last_name, active, active_group, group_row_number

with CustomerActive as (
    select 
        customer_id,
        first_name,
        last_name,
        active,
        ntile(3) over (order by active desc) as active_group
    from customer
)
select 
    customer_id,
    first_name,
    last_name,
    active,
    active_group,
    row_number() over (partition by active_group order by customer_id) as group_row_number
from CustomerActive
order by active_group, group_row_number;

#---------
# 고객별 대여 순위 

desc rental;

select customer_id, count(*) from rental 
group by customer_id 
order by count(rental_id) desc;

#이전 대여와의 간격 

select 
	customer_id, 
    date(rental_date),
	lag(date(rental_date)) over (partition by customer_id order by rental_date)
from rental;

#마지막 대여일자 
select 
	customer_id, 
    date(rental_date),
	lead(date(rental_date)) over (partition by customer_id order by rental_date)
from rental;

#고객별 첫번째 및 마지막 대여 일자 
select 
	customer_id, 
    date(rental_date),
	first_value(date(rental_date)) over (partition by customer_id order by rental_date),
    last_value(date(rental_date)) over (partition by customer_id order by rental_date
										rows between unbounded preceding and unbounded following)
from rental;

#고객별 대여 건의 백분위 순위 및 누적분포 

select 
	c.customer_id,
    count(distinct i.film_id),
    percent_rank() over (order by count(distinct i.film_id) ),
    cume_dist() over (order by count(distinct i.film_id))
from customer as c
join rental as r using(customer_id)
join inventory as i using(inventory_id)
group by customer_id;


#3개 그룹 분할, 대여날짜 기준 오름차순 정렬 
select 
	c.customer_id,
    count(distinct f.title),
    ntile(3) over (order by c.customer_id)
from customer as c
join rental as r using(customer_id)
join inventory as i using(inventory_id)
join film as f using (film_id)
group by c.customer_id;


select 
	customer_id, 
    date(rental_date) as 대여날짜,
	lag(date(rental_date)) over (partition by customer_id order by rental_date) as 이전대여와의간격,
    lead(date(rental_date)) over (partition by customer_id order by rental_date) as 마지막대여,
    first_value(date(rental_date)) over (partition by customer_id order by rental_date) as 첫대여날짜,
    last_value(date(rental_date)) over (partition by customer_id order by rental_date 
										rows between unbounded preceding and unbounded following) as 마지막대여날짜,
    percent_rank() over (partition by customer_id order by count(rental_id) )as 백분위순위,
    cume_dist() over (partition by customer_id order by count(rental_id)) as 누적분포,
    ntile(3) over (order by customer_id)
	
from rental
group by rental_id;


with r_base as (
  select 
      r.customer_id,
      date(r.rental_date) as rental_date
  from rental as r
),
gaps as (
  select
      customer_id,
      rental_date,
      lag(rental_date) over (partition by customer_id order by rental_date) as prev_date
  from r_base
),
cust as (
  -- 고객별 대여수/첫·마지막 대여일/평균 간격(일)
  select
      customer_id,
      count(*)                          as rental_cnt,
      min(rental_date)                  as first_rental_date,
      max(rental_date)                  as last_rental_date,
      avg(datediff(rental_date, prev_date)) as avg_gap_days
  from gaps
  group by customer_id
),
films as (
  -- 고객별 서로 다른 영화 수 (f.title 기준, 네가 쓰던 방식)
  select 
      c.customer_id,
      count(distinct f.title) as film_cnt
  from customer as c
  join rental   as r using(customer_id)
  join inventory as i using(inventory_id)
  join film      as f using(film_id)
  group by c.customer_id
),
base as (
  select
      c.customer_id,
      c.first_name,
      c.last_name,
      cust.rental_cnt,
      cust.first_rental_date,
      cust.last_rental_date,
      cust.avg_gap_days,
      films.film_cnt,
      percent_rank() over (order by films.film_cnt) as pct_rank_by_films,
      cume_dist()   over (order by films.film_cnt)   as cume_dist_by_films
  from customer as c
  left join cust  on cust.customer_id  = c.customer_id
  left join films on films.customer_id = c.customer_id
)
select
    customer_id,
    first_name,
    last_name,
    rental_cnt,
    film_cnt,
    first_rental_date,
    last_rental_date,
    avg_gap_days,
    pct_rank_by_films,
    cume_dist_by_films,
    grp,
    row_number() over (partition by grp order by customer_id) as group_row_number
from (
    -- 3개 그룹: 마지막 대여일 오름차순 기준 (네 메모대로 '대여날짜 기준 오름차순')
    select 
        b.*,
        ntile(3) over (order by last_rental_date) as grp
    from base b
) x
order by grp, group_row_number;


