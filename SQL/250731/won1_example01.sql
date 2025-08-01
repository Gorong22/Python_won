#create database wonsil_customer_db;
#use wonsil_customer_db;

#create table customer (
	#No int not null auto_increment,
    #name char(20) not null, 
    #age tinyint,
    #phone varchar(20),
    #email varchar(30) not null,
    #address varchar(50),
    #primary key(no)

#);

#drop table if exists customer;


#show tables ;

#desc customer;

#alter table customer add column gender varchar(3) after name;
#alter table customer add column color varchar(12) after gender;
#alter table customer modify column color varchar(20) not null;

#alter table customer change column phone mobile varchar(20) not null;

#desc customer;

#alter table customer drop column color ;

#desc customer;

#create database dave;
#use dave;

#create table dave_table (
	#id int unsigned not null auto_increment,
    #name varchar(50) not null,
    #modelnumber varchar(15) not null,
    #series varchar(30) not null,
    #primary key(id)
#);

#desc dave_table;

#alter table dave_table add column address varchar(20) after name;

#alter table dave_table drop column address; 