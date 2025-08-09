#outer join

use sakila;


select * from address 
limit 1;

select * from customer
limit 1;

select * from customer;
RIGHT OUTER JOIN address
on customer.address_id = address.address_id
WHERE customer_id is null; 


SELECT count(*) FROM customer
RIGHT OUTER JOIN address
ON customer.address_id = address.address_id
WHERE customer.customer_id IS NULL;


# 서브카테고리가 '여성신발'인 상품 타이틀만 가져오기 

use bestproducts;

select title from items
join ranking
on items.item_code = ranking.item_code
where ranking.sub_category = '여성신발';

# 서브쿼리 구문을 활용해서 서로 다른 두개의 테이블을 연결해서 값을 찾아온다면 

select title from items
where item_code in
(select item_code from ranking
 where sub_category = '여성신발'
);

