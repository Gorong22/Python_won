

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