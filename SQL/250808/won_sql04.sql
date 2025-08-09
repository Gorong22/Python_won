# 클러스터형 인덱스, 보조형 인덱스가 다른 필드값에 있는 요소들을 사용할 때보다 연산처리속도가 
# 빠르다는 것을 확인하고자 만듦 나의 mysql 설정 및 설치되어 있는 stroage engine 의 형태가 뭔지 알아야함
#engine=InnoDB<- 설정을 해야 클러스터형 인덱스가 속도가 빠른지 알 수 있음 

create database if not exists index_demo_v1; 
use index_demo_v1;

create table customers(
	id int auto_increment primary key,  
	name varchar(100),
    email varchar(100),
    age int,
    city varchar(100)
);

#innoDB를 굳이 작성을 안했던 이유? mySQL 8.0 이상 버전 부터는 기본값으로 innoDB가 기본으로 설정되어있긴 한데 
# 혹시나 아닐 수 도 있으니까 MyISAM<- 이걸로 되어 이씅ㄹ 수도 있음 
#확인하는 방법 show veriables like 'default_xtorage_engine'

show variables like 'default_storage_engine';

desc customers;

insert into customers(name, email, age, city) 
select 
	concat('user', lpad(floor(rand() * 100000), 5,'0')),
	concat('user', floor(rand() * 100000), 5,'0', '@test.com'),
    floor(18 + (rand() * 5)),
    elt((floor(1 + rand() *5)), 'seoul', 'busan', 'incheon', 'daegu', 'daejeon')
 from information_schema.tables limit 1000;
 
 select count(*) from customers;
  select * from customers;
  
create index idx_email on customers(email);

create index idx_age on customers(age);

show index from customers;


select * from customers;

explain select * from customers; # all 376 번의 반환값을 돌고 왔어 

explain select * from customers 
where id = 300;# const 1 

explain select * from customers
where email = ('user95976@test.com');

explain select * from customers
where city = ('Busan');