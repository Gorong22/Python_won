use sakila;

show tables;

desc actor;

select actor_id, first_name, last_name from actor
limit 5;

#각 고객이 어떤 영화 카테고리를 가장 자주 대여하는지 알고싶음
#각 고객별로 가장 많이 대여한 영화 카테고리와 
#해당 카테고리에서의 총 대여 횟수, 해당 고객 이름을 조회 할 수 있는 
#SQL 쿼리문을 작성해주세요 
# 출력할 데이터 : 고객 이름, 총 대여횟수, 각 카테고리 

#A고객 : 액션, 드라마, 패밀리

#A - 액션 : 2 
#A - 드라마 : 1
#A - 패밀리 : 3 
#....
#Z
# 1000건 렌탈 대여 건수 

#A - 액션 / 드라마 / 패밀리 중 가장 렌탈한 횟수가 많은 카테고리를 1번 더 필터링 
#customer/rental = customer_id, inventory_id, film_id, category_id,


desc customer;

# 일단 제일 먼저 join 부터 해야지! 
select 
	C.first_name, 
	C.last_name,
    CAT.name,
	count(*)
from customer as C
join rental as R using(customer_id)
join inventory as I using(inventory_id)
join film_category as FC using(film_id)
join category as CAT using(category_id)
#총 대여 횟수를 이제 구해보자 
#각 사용자별, 각 카테고리의 숫자를 기준으로 삼음 
group by C.customer_id, CAT.name
#having절 부터는 새로운 조건을 단다고 생각하면 좋을 듯 
having COUNT(*) = (
	select count(*) from rental as R2
	join inventory as I2 using(inventory_id)
    join film_category as FC2 using(film_id)
    where R2.customer_id = C.customer_id
    group by FC2.category_id
    order by Count(*) desc
    limit 1
    
);
desc rental;
desc category;


#2006년-02-14 날짜를 기준으로, 2006-01-15부터, 2006-02-14일 날짜 까지 영화를 
#대여하지 않은 고객을 찾아주세요  

desc rental;

select c.first_name, c.last_name  from customer as c
left join rental as r on r.customer_id = c.customer_id
and r.rental_date between '2006-01-15' and '2006-02-14'
where r.customer_id is null
order by c.customer_id;


select 
	c.first_name, c.last_name 
from customer as c 
left join rental as r on r.customer_id = c.customer_id
and timestampdiff(day, r.rental_date, '2006-02-14') <= 30
where r.rental_id is null;

# 가장 최근에 영화를 반납한 상위 10명의 고객이름과, 해당 고객들이 대여한 영화의 이름, 대여 기간을 출력 

desc customer;
select rental_date from rental;

desc rental;
desc film;
desc film_category;
desc inventory;

select c.first_name, c.last_name, f.title, r.return_date, f.rental_duration from customer as c 
join rental as r using(customer_id)
join inventory as i using(inventory_id)
join film as f using(film_id)
where (c.customer_id, r.return_date) IN(
	select customer_id, max(return_date)
    from rental
    where return_date is not null
    group by customer_id

)
order by r.return_date desc
limit 10;

select 
	c.first_name, c.last_name,
    f.title,
    timestampdiff(day, r.rental_date, r.return_date)
from customer as c 
join rental as r using(customer_id)
join inventory as i using(inventory_id)
join film as f using(film_id)
order by r.return_date desc 
limit 10;


#각 직원의 매출을 찾고 각 직원의 매출이 회사 전체 매출 중 어느 정도의 비율을 
# 차지하는지 찾아보세요 출력결과물은 직원의 ID, 직원 이름, 직원매출, 회사 전체 매출의 비율  



SELECT 
    s.staff_id,
    s.first_name,
    s.last_name,
    SUM(p.amount) AS staff_sales,
    ROUND(
        SUM(p.amount) / (SELECT SUM(p2.amount) FROM payment p2), 4
    ) AS share_ratio,
    CONCAT(
        ROUND(SUM(p.amount) / (SELECT SUM(p3.amount) FROM payment p3) * 100, 2), '%'
    ) AS share_percent
FROM staff s
JOIN payment p USING (staff_id)
GROUP BY s.staff_id, s.first_name, s.last_name
ORDER BY staff_sales DESC;

select 
	s.staff_id,
    s.first_name, s.last_name,
    sum(p.amount) as staff_revenue,
    (sum(p.amount) / (select sum(amount) from payment) * 100) as revenu_percentage
from staff as s
join payment as p using(staff_id)
group by s.staff_id;
