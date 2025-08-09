CREATE DATABASE IF NOT EXISTS musinsa_db_v3;
USE musinsa_db_v3; 
CREATE TABLE IF NOT EXISTS customers(
	customer_id INT PRIMARY KEY,
    age INT,
    name VARCHAR(100),
    gender VARCHAR(10),
    address TEXT, -- TEXT는 2byte의 메모리 값을 고정값으로 가져감. <-> VARCHAR는 변하는 값!
    phone VARCHAR(50),
    email VARCHAR(100),
    grade VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS products(
	product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    stock INT,
    main_category VARCHAR(50),
    sub_category VARCHAR(50),
    price INT,
    product_price INT,
    discount_rate INT
);
ALTER TABLE products ADD COLUMN discount_price INT;
CREATE TABLE IF NOT EXISTS orders(
	order_id INT PRIMARY KEY,
    customer_id INT,
    product_id INT,
    quantity INT,
    order_date DATE,
    FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY(product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS reviews(
	review_id INT PRIMARY KEY,
    customer_id INT,
    product_id INT,
    rating INT,
    review_text TEXT,
    review_date DATE,
    FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY(product_id) REFERENCES products(product_id)
);

SELECT * FROM customers;
### 문제 1, 회원등급별 인원수 출력 grade 
SELECT * FROM customers;

SELECT grade,COUNT(*) FROM customers
WHERE name
GROUP BY grade;

-- g해설alter
SELECT grade, COUNT(*) FROM customers
GROUP BY grade; -- 어떻게 마케팅적으로 활용할 것인가?

### 문제 2, 상품별 평균 평점 출력
SELECT product_name,AVG(rating) RT FROM products P
JOIN reviews R
ON P.product_id=R.product_id

-- WHERE rating 없어도 나옴!
GROUP BY product_name
ORDER BY RT DESC;

### 문제 3, 최근 30일 이내 주문된 전체 총 건수 출력!!
SELECT * FROM orders limit 1;
SELECT COUNT(order_date) FROM orders
WHERE order_date >= CURDATE() - INTERVAL 1 MONTH; 

## 선생님 해설
SELECT COUNT(*) FROM orders
WHERE order_date >= CURDATE() - INTERVAL 30 DAY;

#상품별 최근 한달간 주문건수를 구하세요 

show tables;
select * from orders
limit 10;

select * from products
limit 10;

select orders.product_id, products.product_name, count(*) recent_order_date from orders
join products 
on orders.product_id = products.product_id 
where orders.order_date >= curdate() - interval 30 day
group by orders.product_id;




select product_id, count(*)
from orders
group by orders.product_id
order by count(*) desc;


# 고객별 총 구매 건수와 구매 수량을 구하시고. 출력해라 

desc products;
desc orders;

show tables;
desc customers;

select orders.customer_id, count(*) as '구매건수', customers.name, products.product_name, sum(orders.quantity)  as '총구매수량', orders.order_date from orders
join products on products.product_id = orders.product_id
join customers on orders.customer_id = customers.customer_id
where order_date >= curdate() - interval 300 day
group by orders.customer_id, products.product_name, orders.order_date, customers.name
order by sum(orders.quantity) desc ;

select customers.name, sum(orders.quantity)from orders
join customers on orders.customer_id = customers.customer_id 
join  
#where customers.name = '이지원'
#group by orders.customer_id, customers.customer_id; products

#desc customers;
#desc products;

 #sum(orders.quantity)
#선생님 답변 

#select * from orders limit 1;

select 
	customer_id,
    quantity
from orders
limit 10;



#고객별 총 구매금액(할인가 기준 )으로 계싼 
#할인가가 produts에 discount_price 
# 고객은 customers.name
show tables;
desc products;
desc customers;
desc orders;

select customers.customer_id, customers.name, sum(products.discount_price * orders.quantity) as '총합' from orders
join customers on customers.customer_id = orders.customer_id
join products on products.product_id = orders.product_id
group by customers.customer_id
order by 총합 desc;

# 지금까지 가장 많이 팬마된 상품(수량) top 5 출력 

desc orders;
desc products;

# Raw Data
select products.product_id, products.product_name, SUM(orders.quantity) from products
join orders
on products.product_id = orders.product_id 
group by products.product_id, orders.quantity
order by orders.quantity desc 
limit 5;

# Copy Data - 1
select products.product_id from products;
-- join orders
-- on products.product_id = orders.product_id 
-- group by products.product_id
-- order by orders.quantity desc 
-- limit 5;

select products.product_name, sum(orders.quantity) from orders
join products
on products.product_id = orders.product_id
group by orders.product_id
limit 5;

#select orders


#평균 평점이 4.5 이상인 상품명과 평점 출력 (인기상품이 어떤건지 )

# 평점이 어떤 테이블과 칼럼에 있찌? 
show tables;
desc reviews;
select rating from reviews
limit 10;
# 평점은 reviews 테이블에 rating 칼럼에 있음 
#상품명은 prodcuts, product_name에 있겠지 
# 서로 포린키를 쓰고 있을까? -> product_id가 있음
desc products;
desc reviews;

select products.product_name, avg(reviews.rating), count(*) from products
join reviews
on products.product_id = reviews.product_id
group by products.product_name
HAVING avg(reviews.rating) >= 4.5;

#선생님 답변

select p.product_name, avg(r.rating) avg_rating 
from reviews r
join products p
on r.product_id = p.product_id
group by r.product_id
having avg_rating >= 4.5;