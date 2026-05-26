FROM mariadb:11
# init.sql est exécuté automatiquement au premier démarrage du conteneur
COPY backend/db/init.sql /docker-entrypoint-initdb.d/init.sql
