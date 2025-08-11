#use musinsa_db_v4

use musinsa_db_v5;

select * from reviews limit 1;



# 크롤링한 데이터를 기반으로 상품에 대한 충성도 및 어뷰징 검증
select 
	상품명, 
    avg(char_length(리뷰)) 평균_리뷰_길이
from reviews
group by 상품명
order by 평균_리뷰_길이 desc;


select count(*) from reviews
where 리뷰 like '%별로%' or 리뷰 like '%불편%';