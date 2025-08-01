desc students;
select * from students;

update students set name = 'Wonsil' where id = 6;
update students set name = '윤대협' where id = 1;


select * from students where name = "Wonsil";

update students set grade = '9학년', age = '16세'
where id =1 ;

update students set age = '16세', grade = '9학년'
where name = '서태웅';

select name from students where name = '서태웅';

select name from students where name like '%태%';

delete from students

select name from students where id = 7;

select * from students;

delete from students
where id = 7;

insert into students(name, age, grade)
values
('원실이', '15세', '9학냔');

update students set grade = '9학년' where id = 8 and grade = '9학냔
' ;

select * from students;

update students set id = 7 where id = 8; 

create database membership;

use membership;

create table Memeber_table(
id int auto_increment not null, 
name varchar(20) not null,
email varchar(40),
birthday int not null,
joindate int not null,
Point int,
gender varchar(10),
primary key(id)
);


use school;

use membership;

desc Memeber_table;

#insert into Memeber_table(name, email, birthday, joindate, Point, gender)
#values 
#('이원실', 'abc@gmail.com', 920220, 250802, 10000, '남성'),
#('이실', 'ads@gmail.com', 921023, 250220, 500, '남성'),
#('박민서', 'abc@naver.com', 920912, 250928, 10000, '여성');

#select * from Memeber_table;

#select * from Memeber_table where Point >= 1000;
#select * from Memeber_table where email like '%%%@gmail.com'

alter table Memeber_table rename to my_membership;


select * from my_membership where point >= 1000;
select * from my_membership where email like '%%%@gmail.com'