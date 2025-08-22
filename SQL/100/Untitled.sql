create database olive_db;
use olive_db;

create table olive_products (
id int auto_increment primary key,
brand varchar(50) not null,
name varchar(100) not null,
price int not null
);

select * from olive_products
limit 10;

SELECT brand, name 
FROM olive_products
WHERE name LIKE '%수분%';

select name from olive_products;