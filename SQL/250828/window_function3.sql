#영화 길이에 대한 백분위 순위와 누적분포 계산

select 
	title, length,
    percent_rank() over (order by length) as percent,
    cume_dist() over(order by length) as cume
from film;


select 
	customer_id,
    concat(first_name, ", ", last_name) as customer_name,
    ntile(4) over (order by customer_id) as customer_group
from customer;

#payment 테이블에서 고객들의 결제금액을 출력하세요 
#단, 출력 내용은 다음과 같아야 합니다 
# 고객 id, 고객 결제금액, 해당 행의 결제 금액의 이전결제, 해당 행의 결제 금액의 다음 결제 금액이 출력이 되어야한다 

desc customer;
desc payment;

select 
	customer_id, amount, 
    lag(amount) over (partition by customer_id order by payment_date) as previous_amount,
    lead(amount) over (partition by customer_id order by payment_date) as next_amount
from payment;

# 렌탈테이블에서 각 고객별로 첫번째 대여일자와 마지막 대여일자를 출력하세요 
# 출력 결과물에는 고객 ID, 첫번째 대여일자, 마지막 대여일자가 포함되어 있으면 된다 


desc rental;

select 
	distinct customer_id,
    first_value(rental_date) over (partition by customer_id order by rental_date),
    last_value(rental_date) over (partition by customer_id order by rental_date
								  rows between unbounded preceding and unbounded following)
from rental;

#payment 테이블에서 각 직원들이 처리한 첫번째 결제와, 마지막 결제 금액을 출력해라 

select 
	distinct staff_id,
    first_value(amount) over (partition by staff_id order by payment_date),
    last_value(amount) over (partition by staff_id order by payment_date 
								   rows between unbounded preceding and unbounded following)
from payment;

#필름 태이블에서 각 여화의 대여 기간에 대한 백분위 순위, 적분포를 계산해주세요 
#영화 제목, 대여기간, 백분위 순위, 누적분포

desc film;

select 
	title, rental_duration,
    percent_rank() over (order by rental_duration) as percent,
    cume_dist() over(order by rental_duration) as cume
from film;

#customer 테이블에서 각 고객의 총 결제 금액에 대한 백분위 순위와 누적 분포를 계산해주세요 
# 결과값 고객 ID, 총 결제금액, 백분위 순위, 누적분포 -> 출력되어야할 대상 

desc customer;

select 
	c.customer_id,sum(p.amount) as total_amount,
   percent_rank() over (order by sum(p.amount)) as percent,
    cume_dist() over(order by sum(p.amount)) as cume
    
from customer as c 
join payment as p using(customer_id)
group by customer_id
order by total_amount;


# rental table 에서 각 고객별로 대여 순서에 따른 누적 대여 횟수를 출력해주세요 
# 실제 결과값은 대여 ID, 고객 ID, 대여 날짜, 누적 대여 횟수 -> 출력되어야 합니다 


desc rental;

select
	rental_id,
    customer_id,
    rental_date,
    count(*) over (partition by customer_id order by rental_date
					rows between unbounded preceding and current row)
from rental;

#payment table에서 각 고객별로, 결제 일자에 따른 누적 결제 금액을 출력해주세요 
#결제 ID, 고객 ID, 결제 일자, 결제 금액, 누적 결재 금액
desc payment;

select 
	payment_id,
    customer_id,
    payment_date,
    amount as 결제금액,
    sum(amount) over (partition by customer_id order by payment_date
					  rows between unbounded preceding and current row) as 누적금액
from payment;

#rental 테이블에서 각 직원들의 대여 날짜에 따른 대여 횟수와 각 직원별, 누적 대여 회수를 출력 
# 대여 ID, 직원 id, 대여날짜, 대여 회수, 누적대여 회수 출력되어야함 

select 
    staff_id,
    rental_date,
    rental_id as 대여회수,
	sum(rental_id) over (partition by staff_id order by rental_date
						 rows between unbounded preceding and current row) as 누적대여회수
from rental;



select 
	rental_id, staff_id, rental_date,
    count(*) over (partition by staff_id, date(rental_date)) as rental_count,
    count(*) over (partition by staff_id order by date(rental_date)
					rows between unbounded preceding and current row)
from rental;

