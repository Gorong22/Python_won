create database if not exists membership2;
use membership2;

create table members(
	id int auto_increment primary key,
    name varchar(50) not null,
    email varchar(100) not null unique,
    birth_date date,
    signup_time datetime default current_timestamp,
	points decimal(10,2),
    gender enum('남', '여') not null
);

insert into members(name,email,birth_date,points,gender)
values
('마동석','dong@google.com','1990-01-01',1000.50,'남'),
('장첸','jang@naver.com','1992-05-10',3400.70,'남'),
('정마담','jung@naver.com','1992-11-12',120.10,'여');

select * from members;

select points, name from members where points >= 1000;

select name from members 
where email like '%@google.com';

desc members;

select name, birth_date from members
order by birth_date asc;
