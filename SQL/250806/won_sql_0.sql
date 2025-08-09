use interparkDB;

show tables;
select * from performence;

select count(*) as total_performence from performence;

select title, place from performence where place like  '%전국%';

#1. 크롤링한 전체 데이터 수 

#2. 크롤링한 데이터 가운데 어떤 지역.장소에서 가장 많이 공연을 하고 있는지 확인하고자 할때 
select place, count(*) as 개수 
from performence 
group by place
order by 개수 asc;

#3. 특정 장소의 공연을 조회 해보고 싶다 

select * from performence
where place like '%전국%'

#4. 공연 일정이 가까운 순으로 정렬 (* 시작일정을 기준으로 정렬)

select title, place, substring_index(date_range, ' ~ ', 1)
from performence
order by substring_index(date_range, ' ~ ', 1); 
