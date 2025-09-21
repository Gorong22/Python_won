

create database if not exists bookstoreDB;

use bookstoreDB;

create table booklist(
	id int auto_increment primary key,
    category varchar(30) not null,
    title varchar(100) not null,
    price float not null,
    stock varchar(10) not null
    
);



select * from booklist;

create database if not exists playground;

use playground;

create table books (
	id int auto_increment primary key,
    title varchar(100) not null,
    price_gdp int not null,
    rating float not null,
    review_count int not null,
    pr_url varchar(200) not null


);

select * from books 
limit 10;