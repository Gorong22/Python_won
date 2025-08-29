select 
	title,
    length,
    rank() over (order by length desc) as ranking
from film
order by length desc;

select 
	title,
    length,
    dense_rank() over (order by length desc) as dense_ranking,
    row_number() over (order by length desc) as row_numbers
from film
order by length desc;

select 
	c.customer_id,
    concat(c.first_name, " ", c.last_name) as customer_name,
    sum(p.amount) as total_amount,
    rank() over (order by sum(p.amount) desc) ranking,
	dense_rank() over (order by sum(p.amount) desc) dense_ranking,
	row_number() over (order by sum(p.amount) desc) row_nubers
from customer as c
join payment as p using(customer_id)
group by c.customer_id;

select 
	customer_id,
    rental_date,
    count(*) over (partition by customer_id order by rental_date
					ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW )  as cumulative_rentals
from rental;





# customer 테이블에서 고객의 총 지출 금액을 계산하고 총 지출 금액에 따라 고객의 순위를 매겨라 
# 출력되어진 결과 값은 고객 ID, 고객 이름, 총 지출 금액. 순위는 rank가 포햄되도록 해달라 

select c.customer_id, c.first_name, c.last_name, 
	sum(p.amount) over (partition by c.customer_id) as total_amount,
    rank() over (PARTITION BY c.customer_id ORDER BY c.customer_id)
from customer as c
join payment using(customer_id);

select 
	c.customer_id,
    concat(c.first_name, ", ", last_name),
    sum(p.amount),
    rank() over (order by sum(p.amount) desc) ranking
from customer as c
join payment p using(customer_id)
group by c.customer_id;

# film 테이블에서 각 영화의 대여횟수를 계산하고 대여횟수에 따라 영화의 순위를 매겨주세요 
# 만약 같은 대여 횟수가 발생했을 때에는 다음번째 순위를 건너뛰지 않겠스빈다 dense_rank
#출력 값은 영화 제목, 대여횟수, 순위 포함 될 수 잇도록 

desc rental;
desc inventory;
desc film;

select 
	f.title, count(*), 
	dense_rank() over (order by count(*) desc) from film as f
join inventory as i using(film_id)
join rental as r using(inventory_id)
group by f.film_id, f.title;

