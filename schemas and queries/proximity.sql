
CREATE TABLE villagersProximity (
            villager1   STRING,
            villager2   STRING,
            areClose    BOOLEAN,
            PRIMARY KEY (villager1, villager2) NOT ENFORCED
)

    INSERT INTO villagersProximity
SELECT
    t1.`name`   AS villager1,
    t2.`name`   AS villager2,

    -- compute the flag rather than filter:
    (POWER(t1.`x` - t2.`x`, 2)
         + POWER(t1.`y` - t2.`y`, 2)
        < 1024)    AS areClose

FROM `olena_env`.`cluster_us_east`.`villager-location-update` AS t1
         JOIN `olena_env`.`cluster_us_east`.`villager-location-update` AS t2
              ON t1.`name` < t2.`name`
                  AND t1.`timestamp`
                     BETWEEN t2.`timestamp` - INTERVAL '1' SECOND
                     AND t2.`timestamp` + INTERVAL '1' SECOND;

Select * from villagersProximity LIMIT 10