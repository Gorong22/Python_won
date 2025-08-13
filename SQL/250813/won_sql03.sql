create database ecommerce_v1;
use ecommerce_v1;

select * from product;
desc product;

drop database wonsil;

select * from product;

delete from product 
where product_code = 215673150
limit 1;

select * from product;

create database ecommerce_v2;
use ecommerce_v2;

create table teddyproducts(
	ID int unsigned not null auto_increment primary key,
	TITLE varchar(200) not null,
    CATEGORY varchar(20) not null
    
    
);

desc teddyproducts;

select * from teddyproducts;