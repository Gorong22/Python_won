use mysql;

#create user 'wonsil'@'localhost'identified by 'wonsil1234';

#create user 'wonsil2'@'%'identified by 'wonsil1234'

#set password for 'wonsil'@'localhost' = 'wonsil5678';

#drop user 'wonsil'@'localhost';

#drop user 'wonsil2'@'%';

#show grants for 'root'@'localhost';

grant select on school.students to 'wonsil2'@'localhost';

show grants for 'wonsil2'@'localhost';

grant all on school.* to 'wonsil2'@'localhost';

show grants for 'wonsil2'@'localhost';
