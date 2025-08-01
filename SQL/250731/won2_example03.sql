#create database if not exists school; 
#use school;
#create table student(
	#id int unsigned not null auto_increment primary key,

#);

create table student (
    id int unsigned not null auto_increment,
    name varchar(50) not null,
    age int unsigned,
    grade varchar(10),
    primary key(id)
    
    );
    
desc student;
rename table student to students;

drop table students;

use school; 

create table students (
    id int unsigned not null auto_increment,
    name varchar(50) not null,
    age int unsigned,
    grade varchar(10),
    primary key(id)
    
    );
    
    #insert into students values(1, "강백호", 15, 8);
    insert into students (name, age, grade) values("서태웅", 15, "8")
    insert into students (grade, name, age) values("10", "채치수", 17)
    mysql> insert into students (grade, name, age)
    -> values("9", "정대만", 16);
insert into students (grade, name, age)
    -> values("8", "송태섭", 15);
    
    select * from students 
    select name,grade from students; 
    
    select * from students where age = 16;