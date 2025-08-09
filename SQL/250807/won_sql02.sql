select count(*) from ranking;

desc ranking;
desc items; #10201

select * from ranking
limit 1000;

select * from items
inner join ranking on ranking.item_code = items.item_code
where ranking.main_category = "all"; 

select * from items
join ranking 
on ranking.item_code = items.item_code
where ranking.main_category = "all"; 

# 에러가 발생하는 주요 원인 => On 뒤에 어떤 테이블에서 값을 찾아왔는지를 꼭 지정해줘야함
select * from items
join ranking 
on item_code = item_code
where ranking.main_category = "all";

select * from items as a
join ranking as b
on b.item_code = a.item_code
where b.main_category = "all"; 


select * from items a
join ranking b
on b.item_code = a.item_code
where main_category = "all"; #만약 조건절에서 설정한 데이터값이 특정 테이블에서만 사용하는 경우, 테이블 언급을 생략할 수 있다

#관습적으로 특정 테이블을 생략해서 키워드를 입력 => 해당 테이블의 첫 단어를 사용!
select * from items IT
join ranking RA
join idol ID
on RA.item_code = IT.item_code
where RA.main_category = "all"; 

select title from items I
join ranking R
on R.item_code = I.item_code
where R.main_category = "all"; 


# 전체 베스트상품 > main카테고리가 all인 상품들 에서 판매자별 베스트 상품 갯수를 출력해주세요 

desc items;
#판매자 컬럼 items.provider, items.title
desc ranking;
# Raking.main_category 

select items.provider as "판매자", count(*) from items
join ranking 
on ranking.item_code = items.item_code
where main_category = "all"
group by items.provider
order by count(*) desc;

#선생님 해답 

select provider, count(*) from items
join ranking
on ranking.item_code = items.item_code
where ranking.item_code
group by provider;

#메인카테고리가 패션의류인 패션의류 전체 베스트 상품에서 판매자별 
#베스트 상품 개수가 5 이상인 판매자 와 해당 베스트 상품에대한 갯수 

desc ranking;
#main_category, sub_category alter

select sub_category from ranking
limit 1000;
desc items;
# provider 

desc itmes;

desc 

select items.provider from items 
join ranking
on ranking.item_code = items.item_code
where main_category = '패션의류' 
group by items.provider
having count(*) >= 5;
# 와 이제 칼럼의 속성도 잘봐야함 int인지 아닌지 


#SELECT items.provider AS 판매자, COUNT(*) AS 베스트상품_개수
#FROM items
#JOIN ranking ON items.item_code = ranking.item_code
#WHERE ranking.main_category = '패션의류'
#GROUP BY items.provider
#HAVING COUNT(*) >= 5


#메인카테고리가 신발/잡화 
#판매자별 상품개수가 10개 이상인 판매자명, 상품갯수 

desc items;

select main_category from ranking;


select items.provider, count(*) from items
join ranking
on ranking.item_code = items.item_code
where main_category = '신발/잡화'
group by items.provider
having count(*) >= 10
order by count(*)desc;

#메인카테고리가 화장품/헤어 
#해당 카테고리 내 평균, 최대, 최소 할인 가격을 출력해주세요 

desc items;

select ori_price from items
limit 10;

desc ranking;

select avg(items.ori_price), avg(items.dis_price), items.ori_price, items.dis_price from items
join ranking
on ranking.item_code = items.item_code
where main_category = '화장품/헤어'
group by items.ori_price, items.dis_price;

#선생님 답변

select avg(dis_price), max(dis_price), min(dis_price) from items
join ranking
on ranking.item_code = items.item_code
where main_category = '화장품/헤어';

# 지그재그 -> 리뷰크롤링 -> 가성비, 저렴, 경제적 
# 크롤링 -> 지그재그 -> 주요인기상품 및 카테고리 상품명 & 상품가격 & 할인가격 크롤링 
# MySQL -> 평균 // 할인 // 최대할인 



