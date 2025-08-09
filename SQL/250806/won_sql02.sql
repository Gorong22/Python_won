create database nike;

use nike;

create table nike_users(
	user_id int auto_increment primary key,
    user_gender varchar(2) not null,
    user_name varchar(50) not null
);

desc nike_users;

insert into nike_users(user_id, user_gender, user_name)
values 
('1', '남', '이형원'),
('2', '여', '원실이'),
('3', '남', '이원실'),
('4', '여', '김슬');

select * from nike_users;

create table nike_shouses (
	shoues_id int auto_increment primary key,
    shoues_model varchar(100) not null,
    user_id int,
    user_gender varchar(2)
);


#------

create database if not exists nike_db_v1;
use nike_db_v1;

create table if not exists sales (
	sales_id int primary key,
    product_id int,
    sales_date date,
    amount int 
);


desc sales;

insert into sales(sales_id, product_id, sales_date, amount)
values
(201, 100, '2025-07-15', 200),
(202, 100, '2025-07-20', 180),
(203, 200, '2025-07-05', 150),
(204, 100, '2025-06-10', 210),
(205, 200, '2025-06-11', 260),
(206, 300, '2025-05-20', 240),
(207, 100, '2025-05-01', 200),
(208, 300, '2025-04-15', 220),
(209, 200, '2025-04-05', 130);

select * from sales;

#월별 상품에 대한 전체 매출과 순위 

select 
	product_id, 
    date_format(sales_date, '%y-%m') as sales_month,
    avg(amount) AS avg_mothly_sales
from sales
where sales_date >= curdate() - interval 1 year
group by product_id, sales_month
order by product_id, sales_month;