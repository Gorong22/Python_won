/*
현재 이 공간을 통해서 SQL 언어를 작성할 예정 
해당 곡안에 한 줄 씩 코드를 작성 -> 쿼리 문
하나의 쿼리가 종료되었다는 것을 정의 ->;
*/

# 1. DB생성 : 예약어 create databse dbname
#2.Table생성 crate table dbname
#3. DB접속 : use dbname
#4. Data삽입 
#5. DB 삭재 drop database if exist dbname;

#create database dbname;
#show databases;

#use dbname;
/*
create table wonsil_table(
	id int , 
    name varchar(50), 
    primary 
);
*/

#use wonsil;
create table wonsil_table(
	id TINYINT unsigned, 
    name varchar(10),
    primary key(id)

);

create table wonsil_table(
	id float unsigned, 
    name varchar(10),
    primary key(id)

);

 #create table wonsil_table(
	#id float unsigned, 
    #name varchar(10),
    #primary key(id)

#);

#create table wonsil_table(
	#id int unsigned, 
    #name varchar(10),
    #primary key(id)

#);

#create table wonsil_table(
	#id int not null auto_increment, 
    #name varchar(10),
   # primary key(id)

#);

#create table wonsil_table(
	#id int not null auto_increment, 
    #name varchar(10),
    #primary key(id)

#);

#create table wonsil_table(
	#id int not null auto_increment, 
    #name char(10),
    #city varchar(10)
    #primary key(id)

#);


#create table wonsil_table(
	#id int not null auto_increment, 
    #name varchar(20),
    #primary key(id,name)

#);

create table wonsil_table(
	id int not null auto_increment, 
    name varchar(20) not null,
    modelnumber varchar(15) not null,
    series varchar(30) not null,
    primary key(id)

);




