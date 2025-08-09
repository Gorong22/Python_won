desc film;

select rating from film 
group by rating; 

select rating, count(*) from film
group by rating;

select rating, count(*) from film
where rating = 'PG'or rating = 'G'
group by rating;

#필름 테이블에서 영화등급이 G등급인 영화 제목을 출력하세요 

desc film;

select title from film;

select rating, title from film
where rating = 'G';

select title, rating, count(*) from film
where rating = 'G'
group by title, rating

union all

select '총합', '', count(*)
from film
where rating = 'G';

#나는 마지막에 총 합계도 보고싶은데... 


select title, rating from film
where rating = 'G' or rating = 'PG'
group by title, rating;


#영화 개봉 연도가 2006년, 2007년이고 영화 등급이 PG 또는 G 등급인 영화의 제목만 출력해라 

desc film;

select title, release_year, rating, count(*) from film 
where (release_year = 2006 or release_year = 2007) 
		and (rating = 'PG' or rating = 'G')
group by title, release_year, rating;

SELECT title, release_year, rating
FROM film
WHERE release_year IN (2006, 2007)
  AND rating IN ('PG', 'G');


# film 테이블에서 rating으로 그룹을 묶어서, 각 등급별 영화 갯수와 등급, 각 그룹별 
# 평균 rental_rate를 출력해주세요 

select * from film 
limit 10;

select rating, avg(rental_rate) as "평균 렌탈기간", count(*) from film
group by rating

union all

select '총합', '', count(*)
from film;
# group by

#film 테이블에서 rating으로 그룹을 묶어서 각 등급별 영화 갯수와 등급별 평균 렌탈비용을 출려하고 평균 렌탈 비용이 높은 순으로 출력 
desc film;

select rating, count(*), avg(rental_rate) as "평균 렌탈비용" from film
group by rating
order by "평균 렌탈비용" desc;

select 
	rating as "등급", 
	count(*) as "총 갯수", 
	avg(rental_rate) as "평균 렌탈비용" 
from film
group by rating
order by "평균 렌탈비용" desc;


# 각 등급별 영화 길이가 130분 이상인 영화의 갯수와 등급을 출력해보세요 

desc film;

select 
	rating as "등급", length as "영화길이", count(*)
from film 
where length >= 130
group by 등급, 영화길이

union all 

select '총합', '' , count(*)
from film;