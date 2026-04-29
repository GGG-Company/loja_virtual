docker compose down
docker compose build --no-cache
docker compose up -d
docker compose logs -f

claude --resume 1b97505e-13d7-46fc-817f-0063ebcd94fe     