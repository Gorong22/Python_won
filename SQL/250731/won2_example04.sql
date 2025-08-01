#create database if not exists dave;
#use dave;
#create table dave_table(
	#id int unsigned not null auto_increment,
    #name varchar(50) not null,
    #modelnumber varchar(15) not null,
    #series varchar(30) not null,
    #primary key(id)
#)

#desc dave_table;

#alter table dave_table modify column name varchar(20) ;
#alter table dave_table change column modelnumber model_number varchar(10);
#alter table dave_table change column series model_type varchar(10); 

#alter table dave_table change column modelnumber model_number varchar(10) not null;
#alter table dave_table modify column name varchar(20) not null ;
#alter table dave_table modify column model_type varchar(10) not null ; 

#alter table dave_table change column modelnumber model_number varchar(10) not null;
#desc dave_table

desc model_info;