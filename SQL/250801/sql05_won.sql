create database if not exists interparkDB;

use interparkDB;

create table performence(
	id int auto_increment primary key,
    title varchar(100),
    date_range varchar(100),
    place varchar(50)

);

desc performence;

select * from performence;

delete from performence
where id between 11 and 20;

select * from performence;

use musinsa_db;

desc reviews;

select * from reviews;