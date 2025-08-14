use sakila;

show tables;

select p.customer_id, p.amount, p.payment_date from payment as p
where p.amount > (
	select avg(amount) 
    from payment
	where customer_id = p.customer_id
);


#고객에 대한 정보 customer, 지불 payment 그안의 평균 지불 정보가 있음 
#평균 지불 금액보다 이상인 고객의 이름을 찾고 싶음 
select first_name, last_name from customer
where customer_id in(
	select customer_id
    from payment
    where amount > (
    select avg(amount)from payment
    )

);

select first_name, last_name from customer
where customer_id in(
	select customer_id
    from payment
    where amount > 3

);


select first_name, last_name from customer
where customer_id in (
	select customer_id 
    from payment 
    group by customer_id
    having count(*) > (
		select avg(payment_count) 
        from (
				select count(*) as payment_count
            from payment
			group by customer_id
        ) as payment_counts
			
    )
);


# 가장 많이 빌려간 고객 
select first_name, last_name from customer
where customer_id = (
	select customer_id
    from  (
		select customer_id , count(*) as payment_count 
        from payment 
        group by customer_id
    )as payment_counts
	order by payment_count desc
    limit 1
);


#상관 서브쿼리 

select p.customer_id, p.amount, p.payment_date from payment as p
where p.amount > (
	select 
		avg(amount)
	from payment
    where customer_id = p.customer_id
);

# film 테이블에서 평균 영화길이보다 긴 영화들의 제목을 찾아주세요 

select f.title, f.length from film as f
where f.length > (
	select
		avg(length)
	from film
);

#rental 테이블에서 고객별 평균 대여 횟수보다 많은 대여를 한 
# 고객들의 이름(first, last)를 찾아주세요 

desc rental;
desc customer;

select first_name, last_name from customer 
where customer_id in (
	select customer_id 
    from rental
    where rental_date > (
    select avg(rental_date) from rental
    )
);


#rental 테이블에서 고객별 평균 대여 횟수보다 많은 대여를 한 
# 고객들의 이름(first, last)를 찾아주세요 


SELECT 
    first_name, 
    last_name
FROM customer
WHERE customer_id IN (
    SELECT customer_id
    FROM rental
    GROUP BY customer_id
    HAVING COUNT(*) > (
        SELECT AVG(rental_count)
        FROM (
            SELECT COUNT(*) AS rental_count
            FROM rental
            GROUP BY customer_id
        ) AS rental_counts
    )
);


#가장 많은 영화를 대여한 고객의 이름(first name, last) 를 찾아주세요 
# only 1 이니까 

select first_name, last_name from customer
where customer_id = (
	select customer_id 
    from (
		select customer_id, count(*) as rental_count
        from rental
        group by customer_id 
    )as rentals_counts
	 order by rental_count desc
	 limit 1
);


# 가장 많이 빌려간 고객 
select first_name, last_name from customer
where customer_id = (
	select customer_id
    from  (
		select customer_id , count(*) as payment_count 
        from payment 
        group by customer_id
    )as payment_counts
	order by payment_count desc
    limit 1
);


#각 고객 에 대해 자신이 대여한 평균 영화 길이보다 긴 영화들의 제목 
# 출력하세요 
select 
	c.first_name, c.last_name, f.title
from customer as c 
join rental as r on r.customer_id = c.customer_id
join inventory as i on i.inventory_id = r.inventory_id
join film as f on f.film_id = i.film_id
where f.length > (
	select avg(fil.length)
    from film as fil
    join inventory as inv on inv.film_id = fil.film_id
    join rental as ren on ren.inventory_id = inv.inventory_id
	where ren.customer_id = c.customer_id
);
 

#rental과 inventory 테이블을 join하고, film 테이블에 있는 
#replacement_cost가 20달러 이상인 영화를 대여한 고객의 이름을 찾아주세요 
# 고객의 이름은 소문자로 출력해주세요 

desc rental;
desc inventory;
desc film;

select lower(c.first_name), lower(c.last_name) from customer as c 
join rental as r on r.customer_id = c.customer_id 
join inventory as i on i.inventory_id = r.inventory_id 
join film as f on f.film_id = i.film_id
where f.replacement_cost in (
	select f.replacement_cost 
    from film as fil 
    join inventory as inv on inv.film_id = fil.film_id
    join rental as ren on ren.inventory_id = inv.inventory_id
    where fil.replacement_cost >= 20

);


select lower(c.first_name), lower(c.last_name) from customer as c 
join rental as r on r.customer_id = c.customer_id 
join inventory as i on i.inventory_id = r.inventory_id 
join film as f on f.film_id = i.film_id
where f.replacement_cost >= 20;


# 중복값 제거 

select 
	distinct concat(lower(c.first_name), " ", lower(c.last_name)) from customer as c 
join rental as r on r.customer_id = c.customer_id 
join inventory as i on i.inventory_id = r.inventory_id 
join film as f on f.film_id = i.film_id
where f.replacement_cost >= 20;



#film 테이블에서 rating이 "PG-13" 등급인 영화들에서, 
#discription의 길이가 rating이 "PG-13" 등급인 영화들의 평균 descripttion  길이보다 
# 긴 영화의 제목을 찾아주세요 


show tables;

desc film;

select * from film
limit 10;


select title from film
where rating = 'PG-13' and length(description) > (
	select length(avg(description))
    from film
    where rating = 'PG-13'


);

desc customer;
#customer, rental, inventory, film 테이블을 join 하여 2005년 8월에 대여된 
#모든 R등급 영화의 제목과 해당 영화를 대여한 괙의 이메일을 찾아주세

show tables;

desc rental;

select rental_date from rental 
limit 4;

select f.title, c.email from customer as c
join rental as r on r.customer_id = c.customer_id
join inventory as i on i.inventory_id = r.inventory_id 
join film as f on f.film_id = i.film_id 
where 
	extract(year from rental_date) = 2005 and 
    extract(month from rental_date) = 8 and 
	rating = 'R';
    
    
select f.title, c.email from customer as c
-- join rental as r on r.customer_id = c.customer_id
join rental as r using(customer_id)
join inventory as i on i.inventory_id = r.inventory_id 
join film as f on f.film_id = i.film_id 
where 
	extract(year from rental_date) = 2005 and 
    extract(month from rental_date) = 8 and 
	rating = 'R';
    
    
# payment  테이블에서 가장 마지막에 결제된 일시에서 30일 이전 까지의 모든 결제 내역을
# 찾고 해당 결제 내역에 대해서 각 고객별 총 결제 금액과 평균 결제 금액을 소수점 둘째 자리에서 
# 반올림하여 출력하세요 

desc payment;

select c. customer_id, round(sum(amount), 1), round(avg(amount),1) from payment as p
join customer as c on p.customer_id = c.customer_id
where payment_date >= (
select date_sub(max(payment_date), interval 30 day) 
from payment
)
group by c.customer_id;


#actor 와 film_actor 테이블을 join하고 영화 장르가 'Sci-Fi' 카테고리에 속한 영화에 
# 출연한 배우의 이름을 찾으세요. 그리고 해당 배우의 이름은 성과 이름을 연결하여 
# 대문자로 출력하세요 


select concat(upper(a.first_name), " ", upper(a.last_name)) as 'sci-fi 배우' from actor as a
join film_actor as fa on fa.actor_id = a.actor_id
join film_category as fc on fc.film_id = fa.film_id
join category as c on c.category_id = fc.category_id
where c.name = 'Sci-Fi';





desc film_actor;

desc film;
show tables;

desc category; 

select * from category
limit 100;

desc film;

desc film_actor;
desc actor;

desc inventory;


show tables;

desc actor_info;
desc customer;

desc film_category;

select * from film_category
limit 10;
