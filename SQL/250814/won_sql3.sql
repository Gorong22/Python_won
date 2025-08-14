#set sql_safe_updates = 0;

start transaction;
update customer
set first_name = 'MARY'

where customer_id = 1;

#commit

select * from customer
limit 10;

#rollback;