use sqlDB_v1;

desc userTBL;
show index from userTBL;


#클러스터형 인덱스 : UserID 


desc buyTBL;

#클러스터형 인덱스 : num

show index from buyTBL;

alter table userTBL add constraint TESTdate unique(mDATE);

create index idx_birth on userTBL(birthyear);

show index from userTBL;

alter table userTBL add index idx_addr(addr);

show index from userTBL;

alter table userTBL drop index idx_addr;