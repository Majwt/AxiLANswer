
# MrView Backend

This is a single purpose backend for the MrView application. 
It provides an API for fetching data from a database containing tcp connections collected by the MrBig Agent

## How to run

put the following environment variables in a .env file in the root of the backend:

```env
MSSQL_PASSWORD=<db-password>
MSSQL_USER=<db-user>
MSSQL_DATABASE=<db-name>
```
it will automatcially load the environment variables from the .env file when you run the backend.

then run the following command to start the backend:

```bash
./run.sh
```

```ps1
.\run.ps1
```
