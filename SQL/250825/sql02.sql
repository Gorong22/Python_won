WITH rental_data AS (
	SELECT 
		rental_id,
		customer_id,
		rental_date,
		ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY rental_date) AS rental_rank,
		LAG(rental_date) OVER (PARTITION BY customer_id ORDER BY rental_date) AS previous_rental_date,
		LEAD(rental_date) OVER (PARTITION BY customer_id ORDER BY rental_date) AS next_rental_date,
		FIRST_VALUE(rental_date) OVER (PARTITION BY customer_id ORDER BY rental_date) AS first_rental_date,
		LAST_VALUE(rental_date) OVER (PARTITION BY customer_id ORDER BY rental_date
		ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_rental_date,
		PERCENT_RANK() OVER (PARTITION BY customer_id ORDER BY rental_date) AS rental_percentile_rank,
		CUME_DIST() OVER (PARTITION BY customer_id ORDER BY rental_date) AS rental_cume_dist_rank,
		NTILE(3) OVER (PARTITION BY customer_id ORDER BY rental_date) AS rental_group
	FROM rental
),
rental_intervals AS (
	SELECT 
		rental_id,
		customer_id,
		rental_date,
        rental_rank,
        previous_rental_date,
		next_rental_date,
        first_rental_date,
        last_rental_date,
        rental_percentile_rank,
        rental_cume_dist_rank,
		rental_group,
        DATEDIFF(rental_date, previous_rental_date) AS prebious_rental_gap,
        DATEDIFF(next_rental_date, rental_date) AS next_rental_gap
	FROM rental_data 
),
grouped_rental_rank AS (
	SELECT 
		rental_id,
        customer_id,
        rental_date,
        rental_group,
        ROW_NUMBER() OVER (PARTITION BY customer_id, rental_group ORDER BY rental_date) AS group_rental_rank
	FROM rental_data
)
SELECT 
	R.customer_id,
    R.rental_date,
    R.rental_rank,
    R.prebious_rental_gap,
    R.next_rental_gap,
    R.first_rental_date,
    R.last_rental_date,
    R.rental_percentile_rank,
    R.rental_cume_dist_rank,
    G.group_rental_rank
FROM rental_intervals AS R
JOIN grouped_rental_rank AS G USING(rental_id);

        
        
		

