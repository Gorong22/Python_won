create database wconcep;
use wconcep;


CREATE TABLE w_outer_info2 (
id int auto_increment not null primary key,
brand varchar(80) not null,
outer_name varchar(200) not null,
outer_price int unsigned not null,
outer_discount tinyint unsigned not null default 0,
stargrade decimal(2,1) null,
review_count int unsigned not null default 0


);


select count(*) from w_outer_info2;

select * from w_outer_info2;

delete from w_outer_info;

SELECT 
    brand, 
    ROUND(AVG(stargrade), 2) AS 평균별점,
    ROUND(AVG(review_count), 0) AS 평균후기,
    CASE
        WHEN AVG(stargrade) >= 4.5 AND AVG(review_count) >= 100 THEN 'Excellent'
        WHEN AVG(stargrade) >= 3.5 AND AVG(review_count) >= 30  THEN 'Average'
        ELSE 'Poor'
    END AS rating_category
FROM w_outer_info2
GROUP BY brand
ORDER BY 평균별점 DESC;

use wconcep;

show tables;

select * from w_outer_info2;

select review_count from w_outer_info2
order by review_count desc 
limit 3;


select brand, outer_name, stargrade, review_count from w_outer_info2
where stargrade >= 4.3 and review_count >= 612
limit 5;



CREATE TABLE w_outer_info3 (
id int auto_increment not null primary key,
brand varchar(80) not null,
outer_name varchar(200) not null,
outer_price int unsigned not null,
outer_discount tinyint unsigned not null default 0,
stargrade decimal(2,1) null,
review_count int unsigned not null default 0,
review_text varchar(500) not null


);

ALTER TABLE w_outer_info3 MODIFY review_text TEXT NOT NULL;

CREATE TABLE w_outer_info4 (
    id INT AUTO_INCREMENT PRIMARY KEY,     -- 상품 고유번호 (PK)
    brand VARCHAR(80) NOT NULL,
    outer_name VARCHAR(200) NOT NULL,
    outer_price INT UNSIGNED NOT NULL,
    outer_discount TINYINT UNSIGNED NOT NULL DEFAULT 0,
    stargrade DECIMAL(2,1),
    review_count INT UNSIGNED NOT NULL DEFAULT 0
);


CREATE TABLE w_outer_review (
    id INT AUTO_INCREMENT PRIMARY KEY,   -- 리뷰 고유번호
    product_id INT NOT NULL,             -- 어떤 상품의 리뷰인지
    review_text TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES w_outer_info(id) ON DELETE CASCADE
);


drop table w_outer_info4;

drop table w_outer_review;

CREATE TABLE w_outer_info4 (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    brand VARCHAR(80) NOT NULL,
    outer_name VARCHAR(200) NOT NULL,
    outer_price INT UNSIGNED NOT NULL,
    outer_discount TINYINT UNSIGNED NOT NULL DEFAULT 0,
    stargrade DECIMAL(3,2),  
    review_count INT UNSIGNED NOT NULL DEFAULT 0,  
    KEY idx_brand_name (brand, outer_name)
);

CREATE TABLE w_outer_review (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    review_text TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES w_outer_info4(id) ON DELETE CASCADE
);


drop table w_outer_review;

drop table w_outer_info4;

desc w_outer_review;

desc w_outer_info4;

select id, review_text, char_length(review_text) as 글자수 from w_outer_review
order by char_length(review_text) desc 
limit 3;

SELECT 
    wi.brand, 
    wi.outer_name, 
    GROUP_CONCAT(
        wr.review_text 
        ORDER BY CHAR_LENGTH(wr.review_text) DESC 
        SEPARATOR ' || '
    ) AS 대표리뷰
FROM w_outer_info4 AS wi
JOIN w_outer_review AS wr ON wr.product_id = wi.id
WHERE wi.stargrade >= 4.0
  AND CHAR_LENGTH(wr.review_text) >= 100
GROUP BY wi.id
LIMIT 3;