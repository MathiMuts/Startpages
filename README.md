# django-template
A template for Websites using Django, dockerised, redis-cache, tailwind.

## Development:
In development you have to start the tailwind filewatcher as well as the webserver:

1.Activate the `venv` and install necessary libraries. 

>```
>python manage.py tailwind install
>python manage.py tailwind start
>```

>```
>docker compose build
>docker compose up -d
>```

[http://localhost:8000/](http://localhost:xxxx/) voor de devserver. The port is dependent on the settings you set in the .env.

## Production:
In production you want to set the environmentvariables to the correct values for production:
```
DJANGO_DEBUG=False
SSL_TLS=True
```

>```
>docker compose -f docker-compose.yml down
>docker compose -f docker-compose.yml build --no-cache
>docker compose -f docker-compose.yml up -d --remove-orphans
>```

[http://localhost:8080/](http://localhost:xxxx/) voor de prodserver. The port is dependent on the settings you set in the .env.