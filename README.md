# Docker And Kubernetes For Absolute Beginners

## System Requirements
- 4 GB RAM minimum (8 GB recommended) 
- Virtualization must be enabled in BIOS/UEFI 
- ~1 GB disk space for Docker Desktop
-   **OS:** Windows 10/11 (64-bit)

### Installation 
-  [Download Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) 
- Install WSL (Windows Subsystem for Linux): 
```bash wsl --install ``` 
> Restart your machine after WSL installs. ---
	
## Config Docker

### Step 1 — Create a `Dockerfile` in your project root

```
FROM node:22-alpine
WORKDIR /app 
COPY package.json package-lock.json* ./ 
RUN npm install
COPY . . 
EXPOSE 3000 
CMD ["npm", "run", "dev"]
```

Line by line in plain English: 
-  `FROM node:22-alpine` — use Node 22 LTS (stable, long-term support) 
-  `WORKDIR /app` — work inside a folder called `/app` inside the container 
-  `COPY package.json ...` — copy your package files in first
-  `RUN npm install` — install dependencies 
-  `COPY . .` — copy the rest of your project files 
-  `EXPOSE 3000` — tell Docker your app uses port 3000 
-  `CMD ["npm", "run", "dev"]` — start the app

### Step 2 — Create a `.dockerignore` in your project root

```
node_modules
.next
.git
.env.local
# This works like `.gitignore` — it stops Docker from copying unnecessary files into your image, keeping it small and fast.
```

### Step 3 — Create a `.env.local` file (if you don't have one)

If your app uses environment variables, make sure your `.env.local` exists in the project root. Example:
```
NEXT_PUBLIC_API_URL=[http://localhost:3000]
```

### Step 4 — Run these commands

```
# 1. Build the image (do this once, and again when you change dependencies) 
docker build -t basic-app . 

# 2. Run the container 
docker run --rm -p 3000:3000 --env-file .env.local basic-app 

# 3. Open your browser and visit: 
# http://localhost:3000
```

**Breaking it into pieces:**

- `docker run` Start a new container
- `--rm` Without this flag, when a container stops, it remains on your host machine in an "Exited" state.
- `-p 3000:3000` Map port 3000 on your machine → port 3000 inside the container
- `--env-file .env.local` Read your `.env.local` file and inject every variable into the container
- `basic-app`The image name to run (what you built with `docker build -t basic-app .`)

    
### Step 5 --- Simplify with docker compose file 
 
Create a  `docker-compose.yml`  in your project root
```
# docker-compose.yml 
services: 
	app: 
		build: . 
		ports: 
			-  "3000:3000" 
		env_file: 
			- .env.local
# bonus - If you need hmr than use volumes and environment else remove it.
		volumes:
			- .:/app
			- /app/node_modules
		environment:
			- CHOKIDAR_USEPOLLING=true
			- WATCHPACK_POLLING=true
			- WATCHPACK_POLLING_INTERVAL=1000
		command: npm run dev
```

**Breaking into pieces:**

- `services:` Defines what containers to run
- `app:` Name of your container (you can call it anything)
- `build: .` Build the image from the `Dockerfile` in the current folder
- `ports: "3000:3000"` Same as `-p 3000:3000` in `docker run`
- `env_file: .env.local` Same as `--env-file .env.local` in `docker run`
- `volumes` The volume syncs your code live into the container
- `.:/app` The dot `.` means your current project folder on your machine. `/app` is the folder inside the container. This line says — _"keep these two folders in sync, whatever I change locally, reflect it inside the container instantly."_ This is what makes HMR possible.
- `/app/node_modules` Without this line, the volume above would overwrite the container's `node_modules` with your local one (built for Windows) and break things. This line says — _"for node_modules specifically, ignore what's on my machine and keep the container's own copy."_

The polling variables make the file watcher work inside Docker on Windows/Mac, and together they give you HMR.

### Commands

```
# Start your app 
docker compose up 

# Start in background (detached mode) 
docker compose up -d 

# Rebuild image and start (run this when you change dependencies) 
docker compose up --build

# Stop your app 
docker compose down 

# Stop your app and clear volumes
docker compose down -v
```

**vs what you were doing before**
|Before|Now  |
|--|--|
|`docker build -t basic-app .` | `docker compose up --build` |
|`docker run -p 3000:3000 --env-file .env.local basic-app` |`docker compose up` |

**The ones you'll use 90% of the time**

| Task | Command |
|--|--|
|See images |`docker images`|
|Delete image|`docker rmi <image_name>`|
|Clean up all images|`docker image prune -a`|
| See running containers | `docker ps` |
|See ALL containers (including stopped ones)|`docker ps -a`|
|Get inside container|`docker exec -it <id> sh`|
|See details about a container (ports, volumes, env vars etc)|`docker inspect <container_id>`|
|Stop a running container|`docker stop <container_id>`|
|Delete container|`docker  rm  <container_id>`|
|Clean up all container|`docker container prune -a`|
|Watch running projects|`docker compose ps`|
|Watch logs|`docker compose logs`|
| Watch live logs | `docker compose logs -f` |
|See logs of a specific service |`docker compose logs <app_name>`|
|See last 50 (change the number according to need) lines only| `docker compose logs --tail=50`|
