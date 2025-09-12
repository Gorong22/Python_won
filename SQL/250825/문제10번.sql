use sakila;

desc payment;

with a AS(
	select 
		customer_id,
		payment_date,
		sum(amount) over(partition by customer_id order by payment_date) as cumulative_amount,
		LAG(payment_date) OVER (PARTITION BY customer_id ORDER BY payment_date) AS prev_payment,
		LEAD(payment_date) OVER (PARTITION BY customer_id ORDER BY payment_date) AS next_payment,
        amount - LAG(amount) OVER (PARTITION BY customer_id ORDER BY payment_date) AS prev_payment_diff,
        LEAD(amount) OVER (PARTITION BY customer_id ORDER BY payment_date) - amount AS next_payment_diff,
        
		FIRST_VALUE(payment_date) OVER (PARTITION BY customer_id ORDER BY payment_date) AS first_payment_date,
		LAST_VALUE(payment_date) OVER (PARTITION BY customer_id ORDER BY payment_date
									   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_payment_date
        
	from payment
),
b AS(
	select 
		customer_id,
        payment_date,
        cumulative_amount,

        first_payment_date,
		last_payment_date,
        prev_payment,
        next_payment,
         prev_payment_diff,
         next_payment_diff,
		ntile(5) over (order by cumulative_amount) as total_amount_group,
        dense_rank() over (partition by customer_id order by cumulative_amount) as payment_pct_rank
	from a
)
select 
	    	customer_id,
        payment_date,
        cumulative_amount,
        first_payment_date,
		last_payment_date,
        prev_payment,
        next_payment,
         prev_payment_diff,
         next_payment_diff,
        PERCENT_RANK() OVER (PARTITION BY customer_id ORDER BY payment_date) AS payment_percentile_rank,
		CUME_DIST() OVER (PARTITION BY customer_id ORDER BY payment_date) AS payment_cume_dist,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY payment_date)  as group_row_number
from b;
        



