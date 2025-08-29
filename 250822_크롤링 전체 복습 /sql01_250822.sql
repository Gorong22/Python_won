USE wconcept_db_v2;
SELECT * FROM top100_products;
/*
main_products라는 변수생성(임계값, 파라미터)
기준값을 설정하기 위해 사용
*/ 
SET @main_products := 20;
SET @excellent := 4.50;
SET @average := 4.00;

WITH cat AS (
	SELECT 
		category,
        COUNT(*) AS product_cnt,
        SUM(review_count) AS total_reviews,
        ROUND(AVG(avg_rating), 2) AS avg_rating
    FROM top100_products
    GROUP BY category
    HAVING COUNT(*) >= @main_products
)

SELECT 
	category,
    product_cnt,
    total_reviews,
    avg_rating,
    CASE
		WHEN avg_rating >= @excellent THEN "Excellent"
        WHEN avg_rating >= @average THEN "Average"
        ELSE "Poor"
    END AS grade
FROM cat
ORDER BY avg_rating DESC;


/*
카테고리별 리뷰수 기준 상위 10%에 해당하는 상품 목록 찾아보세요
GROUP BY 그룹으로 정렬!
전체 총 데이터를 10등분으로 균일하게 나눠서 10%에 해당되는 자료값만 찾아오겠다
*/

WITH ranked AS (
	SELECT 
		*,
		#카테고리별(PARTITION BY)로 계산한 걸 10등분으로 나눔
		NTILE(10) OVER (PARTITION BY category ORDER BY review_count DESC) AS decile
    FROM top100_products
)
SELECT
	category,
    product_name,
    review_count,
    avg_rating
FROM ranked
WHERE decile = 1 #1/10 10개로 쪼개진 것 중에 하나 즉, 상위 10%를 찾아오라는 의미
ORDER BY review_count DESC;

