select film_id from film
union
select film_id from inventory;

select film_id from film
union all
select film_id from inventory;

select film_id from film
intersect
select film_id from inventory;

#intersect는 최신버전 예전 버전에서는?

select distinct f.film_id
from film as f 
join inventory as i on i.film_id = f.film_id;

select film_id 
from film
where film_id in (
	select film_id 
    from inventory
);

select film_id from film
except
select film_id from inventory;

select f.film_id from film as f
left join inventory as i on f.film_id = i.film_id
where i.film_id is null;

select f.film_id 
from film as f 
where film_id not in (
	select i.film_id 
	from inventory i
);

select f.film_id
from film as f 
where not exists (
	select i.film_id
    from inventory as i
	where f.film_id = i.film_id
);

#film 테이블과 film_category 테이블 에서 각각 중복없이 film_id를 조회하는 sql 구문 

select distinct f.film_id
from film as f 
join film_category as fc on fc.film_id = f.film_id; 

start transaction

update payment set amount = 10.0