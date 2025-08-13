use sakila;

show tables;

select * from actor
limit 10;

select * from film
limit 10;

select title, length(title) as '영화글자 수' from film 
limit 10;

select title, lower(title) as 소문자변환 
from film limit 10;

select title, 
upper(title) as 대문자변환, 
lower(title) as 소문자변환,

length(title) as '영화글자 수'
from film limit 10;

select title, 
upper(title) as 대문자변환, 
lower(title) as 소문자변환,
length(lower(upper(title))) as special_title,
length(title) as '영화글자 수'
from film limit 10;

show tables;

select 
concat(first_name, " ", last_name),
first_name,
last_name 
from actor limit 10;

show tables;

select 
	description,
    substring(description, 2, 10) as short_description
from film limit 10;


desc film ;

select title, length(title) as 글자수 from film 
where length(title) > 15; 

#actor 테이블에서 첫번째 이름이 소문자로 john인 배우들의 전채 이름을 찾아오는데 대문자로 출력해라 

desc actor;

select * from actor 
where lower(first_name) = 'john';



select upper(concat(first_name, " ", last_name)) from actor 
where lower(first_name) = 'john';



select * from actor
where first_name = 'john';


select * from actor;

#film테이블에서 description의 3번째 글자부터 6글자가 'action'인 영화의 제목을 찾아서 출력 해라

desc film;

select title, description from film
where substring(description, 3, 6) = 'action';


select NOW();
select curdate();
select curtime();

show tables;

select * from rental limit 5;

#일 단위의 값 추가
select 
	rental_date, 
    date_add(rental_date, interval 7 day)
from rental
limit 10;

#월 단위의 값 추가 
select 
	rental_date, 
    date_add(rental_date, interval 7 month)
from rental
limit 10;

#시간 단위 값 추가 
select 
	rental_date, 
    date_add(rental_date, interval 7 hour)
from rental
limit 10;

# 분단위도 가능 

select 
	rental_date, 
    date_add(rental_date, interval 7 minute)
from rental
limit 10;

#초 단위도 가능 
select 
	rental_date, 
    date_add(rental_date, interval 50 second)
from rental
limit 10;

#이제 시간을 돌린다면? 초단위로 돌리기 

select 
	rental_date, 
    date_sub(rental_date, interval 7 second)
from rental
limit 10;

show tables;

select * from payment limit 10;

select 
	payment_date,
    EXTRACT(year from payment_date)
from payment;

#구체적으로 특정 년도에 해당되는 데이터값만 추출해서 찾아오고자 할 때, 유용한 문법 
select
	payment_date
from payment
where extract(second from payment_date) = 20;

#렌탈되고 있는 각 월 마다의 빌려가는 횟수 등을 확인 
select * from payment limit 10;

select 
	extract(month from payment_date) as payment_month , count(*)
from payment
group by payment_month;

select 
	year(payment_date) as year,
    month(payment_date)as month,
    day(payment_date) as day,
    count(*)
from payment;

select 
	dayofweek(payment_date) as payment_dayofweek, count(*)
from payment
group by payment_dayofweek;


select 
	#date_format(payment_date, '%W') as payment_dayname,
    date_format(payment_date, '%a') as payment_dayname,
    count(*) as total_count
from payment
group by payment_dayname;

select 
	case dayofweek(payment_date)
		when 1 then '일요일'
        when 2 then '월요일'
        when 3 then '화요일'
        when 4 then '수요일'
        when 5 then '목요일'
        when 6 then '금요일'
        when 7 then '토요일'
	end as payment_dayname, 
    count(*) as total_count
from payment 
group by payment_dayname
order by total_count desc ;

show tables;

select 
	rental_date,
    return_date,
	timestampdiff(week, rental_date, return_date) as rental_days

from rental 
limit 5;

select 
	rental_date,
    return_date,
	timestampdiff(hour, rental_date, return_date) as rental_days

from rental 
limit 20;


select 
	rental_id,
    rental_date,
    date_format(rental_date, '%Y-%M-%D') as formatted_rental_date
from rental
limit 5;

select 
	rental_id,
    rental_date,
    date_format(rental_date, '%Y-%m-%d') as formatted_rental_date
from rental
limit 5;

select 
	rental_id,
    rental_date,
    date_format(rental_date, '%Y:%m:%d') as formatted_rental_date
from rental
limit 5;


# rental 테이블에서 대여 시작 날짜가 2006년 1월 1일 이후인 모든 대여에 대해 예산 반납 날짜를 
# 대여 날짜로 부터 5일 뒤로 설정하여, 출력해주세요

desc rental;

select rental_date, date_add(rental_date, interval 5 day) from rental
where extract(year from rental_date) = 2006;

select 
	rental_date, date_add(rental_date, interval 5 day) as return_date
from rental
# where extract(year from rental_date) >= 2006;
#where year(rental_date) >= 2006;
where rental_date >= '2006-01-01';


select 
	-amount,
    ABS(-amount) as absolute_amount, 
    CEIL(amount) as ceiling_amount,
    FLOOR(amount) as flooring_amount,
    ROUND(amount, 1),
    ROUND(amount)
from payment 
limit 10;

select SQRT(4);

#payment 테이블에서 결제금액(amount)이 5 이하인 모든 결제에 대해 절대값을 계산하여 출력해주세요 

select sum(ABS(amount)) from payment 
where amount <= 5; 


#film 테이블에서 영화 길이가 120분 이상인 모든 영화에 대해 영화 길이의 제곱근을 계산해주세요 

select title, SQRT(length) from film
where length >= 120;

# payment테이블에서 결제금액을 소수점 첫번째 자리에서 반올림하여 출력해주세요 

select round(amount,0) from payment;


desc payment;
