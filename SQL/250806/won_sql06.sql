create database if not exists sqlDB_v1;
use sqlDB_v1;

create table userTBL(
	userID char(8) not null primary key,
    name varchar(10) unique not null,
    birthyear int not null,
    addr char(2) not null,
    mobile_1 char(3),
    mobile_2 char(8),
    height SMALLINT,
    mDate date

);


create table buyTBL(
	num int auto_increment not null primary key,
    userID char(8) not null,
    prodName char(4),
    groupName char(4),
    price int not null,
    amount smallint not null,
    foreign key (userID) references userTBL(userID)
);

alter table buyTBL modify column prodName char(10);

desc buyTBL;

insert into userTBL(userID, name, birthyear, addr, mobile_1, mobile_2, height, mDate)
values
('wonsil', '이원실', '2020', '암사', '010', '12345678', 40, '2000-01-01');

insert into buyTBL(userID, prodName, groupName, price, amount)
values
('wonsil', '나이키에어조던', '패션잡화', 30, 2);

select * from userTBL;

delete from userTBL where userID = 'wonsil';

