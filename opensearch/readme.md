docker compose \
-f docker-compose-default.x.yml \
up --build -d

Minimum 8 characters
Must contain at least one uppercase letter [A–Z]
One lowercase letter [a–z]
One digit [0–9]
One special character

export OPENSEARCH_INITIAL_ADMIN_PASSWORD=

http://localhost:5601/app/home#/


curl -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD -k \
https://localhost:9200/_cluster/health?pretty


