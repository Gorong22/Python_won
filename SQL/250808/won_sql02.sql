#1. 메인카테고리와 서브카테고리별 평균할인가격과 평균할인률을 계산해라

SELECT * FROM bestproducts.items;
desc items;

desc ranking;

desc ranking;

select * from ranking;

#select mai

select items.title, avg(items.dis_price), avg(items.discount_percent) from ranking
join items
on ranking.item_code = items.item_code 
group by ranking.main_category, ranking.sub_category, items.title;

#판매자별 베스트상품 개수, 평균할인가격, 평균할인률을 내림차순으로 출력해라 
# 상품개수 순으로 내림차순 정렬해주세요 

# 판매자 = itmes.provider  상품명 : items.title, 베스트상품 ranking.item_ranking

select items.provider, items.title, count(*), ranking.item_ranking, avg(items.dis_price), avg(items.discount_percent) from items
join ranking
on ranking.item_code = items.item_code
group by items.provider, items.title, ranking.item_ranking
order by count(*);

# 선생님 답변

select provider, avg(dis_price) dis_price, avg(discount_percent) dis_percent from items
group by provider
order by count(*) desc;

desc items;
desc ranking;

select 

#메인카테고리별 베스트 상품 갯수가 20개 이상인 판매자의 판매자별 평ㅇ균할인가격, 평균할인률, 베스트 상품 개수를 출력 

select items.provider,count(*), avg(items.dis_price), avg(items.discount_percent) from items
join ranking
on ranking.item_code = items.item_code
where items.provider is not null and items.provider != ''
group by ranking.main_category, items.provider
order by count(*) desc;

 
 SELECT 
  items.provider,
  COUNT(*),
  AVG(items.dis_price),
  AVG(items.discount_percent)
FROM items
JOIN ranking ON ranking.item_code = items.item_code
WHERE items.provider IS NOT NULL AND items.provider != ''
GROUP BY ranking.main_category, items.provider
ORDER BY COUNT(*) DESC;


#items 테이블에서 dis_price가 5만원 이상인 상품들 중 
#main_category별 평균 dis_price, discount_percent 출력 
desc ranking;

select main_category, items.title, avg(items.discount_percent), avg(dis_price) from items 
join ranking
on items.item_code = ranking.item_code 
where items.dis_price >= 50000
group by ranking.main_category, items.title, items.dis_price;


