use school;
select database();
desc students;

SELECT * FROM STUDENTS;

 UPDATE STUDENTS SET AGE = "15세" WHERE ID =1;
 
 ALTER TABLE STUDENTS MODIFY COLUMN
 AGE VARCHAR(20);
 
 select * from students where id = 1;
 
UPDATE STUDENTS SET AGE = "15세" WHERE ID =2;
UPDATE STUDENTS SET AGE = "17세" WHERE ID =3;
UPDATE STUDENTS SET AGE = "16세" WHERE ID =4;
UPDATE STUDENTS SET AGE = "15세" WHERE ID =5;
UPDATE STUDENTS SET AGE = "19세" WHERE ID =6;
UPDATE STUDENTS SET AGE = "18세" WHERE ID =7;

select * from students;

update students set grade = "8학년" where ID =1;
update students set grade = "8학년" where ID =2;
update students set grade = "10학년" where ID =3;
update students set grade = "9학년" where ID =4;
update students set grade = "8학년" where ID =5;
update students set grade = "8학년" where ID =6;
update students set grade = "7학년" where ID =7;



select * from students ;

select name from students;

select * from students where age != "16세";
select * from students where age <= "15세";
select * from students 

select * from students where grade != "10학년";

select * from students where grade != "10학년";

select * from stduents where age >= "15세" and grade = "10학년"; 
select * from students
where age >= "15세" and grade = "8학년"
;

select * from students
where age <= "16세" or grade = "8학년"
;

select * from students 
where name like "박%%";

select * from students 
where name like "_태_";

select * from students
where name like "%태%"

CREATE DATABASE dbname;