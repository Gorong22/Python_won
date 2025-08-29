#customer 테이블과 payment 테이블을 사용해서 각 도시별 고객의 총 결제 금액 순위를 출력 
# 고객 ID, 도시, 총 결제 금액, 도시 순위


show tables;
desc city;
desc address;
desc customer; 

select 
	c.customer_id,
    ci.city,
    sum(p.amount) as 총금액,
    rank() over (order by sum(p.amount) desc) as 금액랭킹
from payment as p 
join customer as c using(customer_id)
join address as a using(address_id)
join city as ci using(city_id)
group by c. customer_id, ci.city;

select 
	c.customer_id, ci.city,
    sum(p.amount) as total_amount,
    rank() over (partition by ci.city order by sum(p.amount)desc) as city_rank
from customer as c
join address as a using(address_id)
join city as ci using(city_id)
join payment as p using(customer_id)
group by c.customer_id;

#customer 테이블에서 고객별 대여 횟수에 따라 4개의 그룹으로 눠주세용 
#고객 ID, 대여횟수, 그룹 -> 출력될 수 있도록 해주세용 

desc customer;
desc rental;


select 
	c.customer_id,
	count(*),
    ntile(4) over (order by count(*) desc)
from customer as c 
join rental as r using(customer_id)
group by c.customer_id;


#film 테이블에서 영화를 대여기간에 따라서 5개의 그룹으로 나눠주세요 
# 영화 ID, 대여기간, 그룹 -> 출력되어야 할 데이터 

desc film;


select 
		film_id,
        rental_duration,
        ntile(5) over (order by rental_duration desc)
from film;

#payment 테이블에서 각 고객별로 지불 내역에 행 번호를 부여해주세요 
# 고객별 지불 내역의 행 번호는 payment_date가 낮은 순으로 부여해주세요 (빠른순)
# payment_id, customer_id, payment_date, amount, 행번호 

desc payment;

select 
	payment_id, 
    customer_id, 
    payment_date,
    amount,
	row_number() over (partition by customer_id order by payment_date) 
from payment;


select 
	payment_id,
    customer_id
    payment_date,
    amount,
    row_number() over(partition by customer_id order by payment_date)
from payment;

#film 테이블에서 각 등급별로 영화에 행 번호를 부여하세요 
#영화는 대여기간에 따라 정렬될 수 있도록 해주세요 
#영화 ID, 등급, 대여기간 

desc film;

select 
	film_id,
    rating,
    rental_duration,
    #row_number() over (partition by film_id order by rental_duration)
    row_number() over (partition by rating order by rental_duration)
from film;

#customer 테이블과 payment 테이블을 사용해서 고객을 총 결제금액에 따라 10개의 그룹을 나누고 
# 각 그룹 내에서 고객별 총 결제 금액에 따라 번호를 부여하세요 
# 고객 ID, 총 결제 금액, 그룹, 그룹 내 행 번호 

select 
	c.customer_id,
    sum(p.amount),
    ntile(10) over (order by sum(p.amount)),
    row_number() over (order by sum(p.amount))
from customer as c 
join payment as p using (customer_id)
group by c.customer_id;



with CustomerPayments as (
	select 
		c.customer_id, 
		sum(p.amount) as total_amount
	from customer as c 
	join payment as p using(customer_id)
	group by customer_id

),
CustomerGroup as (
	select
		customer_id, total_amount,
        ntile(10) over (order by total_amount) as ten
    from CustomerPayments

)
select 
	customer_id, total_amount, ten,
    row_number() over (partition by ten order by total_amount) as row_numbers
from CustomerGroup;

