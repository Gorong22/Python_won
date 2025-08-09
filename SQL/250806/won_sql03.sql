show tables;

select count(*) from film;
select * from film 
limit 10;

select distinct rating from film;

desc film;

select distinct release_year from film;

select * from rental
limit 10;

#렌탈 테이블에서 인벤토리 id 값이 367인 값만 출력한다면 
desc rental;

select * from rental where inventory_id = 367;

# 고객 관련 데이터를 찾아보고 싶다 

select count(*) from customer;

select * from customer
limit 10;


select count(*) from payment;
select * from payment
limit 5;

select 
	sum(amount), avg(amount),
    max(amount), min(amount)
from payment ;

#rental 테이블에서 inventory_id가 367 이고, staff_id가 1인 

select * from rental where inventory_id = 367 ; 

select * from rental where inventory_id = 367 and staff_id = 1;


