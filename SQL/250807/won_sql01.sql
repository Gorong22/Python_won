create database if not exists bestproduct;
use bestproduct;

create database if not exists bestproducts;
use bestproducts;

drop database bestproduct;

select count(*) from items;

select count(*) from ranking;

select * from items
limit 10 ;

desc items;

#특정 칼럼을 기준으로 정보를 조회하고 싶다면 
# 저렇게 되면 10000개 이상 프로바이더를 다 찾아옴 
# 가설 베스트 랭킹에 등록되어있는 약 1만개 이상의 업체들 가운데 진짜 베스트 오브 베스트 업체라고 한다면, 베스트 랭킹 안에 약
# 100개 정도의 자사 혹은 위탁 상품을 가지고 운영하고 있지 않을까?

select provider from items
group by provider having count(*) >= 100;

# sum, max, min, avg, count등과 같은 집계함수들은 절대 
# group by와 함께 where절 로는 사용불가
# 해당 상황이 바로 having 절을 사용해야 하는 상황
# 결론 : group by와 집계함수는 where 절로는 절대 사용불가 
# having절의 위치는 반드시 Group by 뒤에 오면 된다 


#group by 설정을 했다고 해서 집계함수를 아예 사용불가 X 
#WHERE 절 안에 집계함수를 사용하고자 할 떄에만 불가능하다 
#ex) select provider, count(*) form 테이블명 <- 괜찮음 
# 하지만 where 절 안에 는 절대 쓸 수 없다alter

select provider, count(*) from items
group by provider having count(*) >= 100;


select provider, count(*) from items
where 
	provider != "" and provider != '스마일배송'
group by provider
having count(*) >= 100
order by count(*) desc; 