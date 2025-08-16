use musinsa_ranking;

show tables;

DESC ranking_products;

select * from ranking_products
limit 10;

# 상품별 할인율 top 5  조회 
select product_name as 상품명, brand_name as 브랜드, discount_rate as 할인율 
from ranking_products 
order by discount_rate desc 
limit 5;

#- 브랜드별 평균할인률 및 평균 리뷰 수
select brand_name, round(avg(discount_rate), 1 ), floor(avg(review_count))
from ranking_products
group by brand_name;

#- 리뷰수 대비 가격이 가장 높은 상품 TOP 3

select product_name, price, review_count,(price/review_count) as 리뷰수_대비_가격 
from ranking_products 
where review_count >= 5
order by 리뷰수_대비_가격 desc 
limit 3;