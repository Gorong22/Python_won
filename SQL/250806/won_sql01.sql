#netflix data 분석 마케터 
# 특정 데이터 존재 = 사용자별 하루 시청 시간 
# A 사용자가 10일 5시간 30분 시청 
# B 사용자가 15일 3시간 시청 
#... 나이대 32, 33 여성 직장인 장르 

# STP => Segment => Target => Positinig => Persona

create database netflix;

use netflix;

create table user (
id int auto_increment primary key,
gender varchar(2) not null,
name varchar(50) not null,
age int not null,
logintime int not null,
average int not null,
logouttime int not null
);


create table users (
	user_id int primary key,
    user_name varchar(50)
);

insert into users (user_id, user_name)
values 
(1, 'Alice'), (2, 'david'), (3, 'cathy');

select * from users;

Create table watch_history (
	wathch_id int primary key, 
    user_id int,
    date_time date,
    hours_watched DECIMAL(4, 1),
    foreign key(user_id) REFERENCES users(user_id)

);

alter table watch_history change column wathch_id watch_id int;

desc watch_history;

desc watch_history;

insert into watch_history (watch_id, user_id, date_time, hours_watched)
values 
	(101, 1, '2025-07-10', 5.5),
    (102, 1, '2025-07-15', 3.0),
    (103, 2, '2025-07-20', 7.0),
    (104, 3, '2025-06-30', 2.5),
    (105, 2, '2025-07-05', 4.0),
    (106, 3, '2025-07-12', 6.5),
    (107, 1, '2025-06-25', 1.0),
    (108, 2, '2025-07-30', 2.0);
    
    
select * from watch_history;

# 특정 사용자의 영상 시청시간 기준, 내림차순 

select * from users; 

# 다른 테이블을 합쳐서 공통된 자료 찾기 -> #한달 전부터 지금까지 시청시간이 많은 사람  
select u.user_id, u.user_name, sum(w.hours_watched) as total_hours
from users as u
join watch_history as w on u.user_id = w.user_id
where w.date_time >= curdate() - interval 1 month
group by u.user_id, u.user_name
order by total_hours desc
limit 10;  
