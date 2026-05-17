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
|Image rename OR add or update tag|`docker tag old-image-name:latest new-image-name:v1.0.0`|


# Production Dockerfile

#### Why do we need a production ready Dockerfile?

Your dev Dockerfile is built for convenience — it runs `npm run dev`, includes dev dependencies, and prioritizes speed over everything else. That's fine locally but wrong for production.

A production Dockerfile should be:

-   **Small** — no source code, no dev tools, no unnecessary files
-   **Fast** — pre-built, just runs the output
-   **Secure** — less code in the image means smaller attack surface

#### What is a multi-stage build?

A multi-stage build uses multiple `FROM` steps in one Dockerfile. Each stage does one job and passes only what's needed to the next. The final image ends up lean because it only contains the output — not the tools used to build it.

```
Stage 1 (deps)      → install dependencies
Stage 2 (builder)   → build the app
Stage 3 (runner)    → run the built app only
```

#### Step 1 — Create `Dockerfile.prod` in your project root

dockerfile

```dockerfile
# Stage 1 — Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Stage 2 — Build the app
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3 — Run the app
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```
#### What is happening in `Dockerfile.prod`

##### Stage 1 — Dependencies

dockerfile

```dockerfile
FROM node:20-bullseye AS deps
```

-   Uses full Debian environment — better compatibility when installing packages that need to compile native code
-   `npm ci` instead of `npm install` — installs exactly what's in `package-lock.json`, no version drift, no surprises

----------

##### Stage 2 — Build

dockerfile

```dockerfile
FROM node:20-bullseye AS builder
```

-   Copies `node_modules` from Stage 1 — no reinstalling
-   Copies your source code and runs `npm run build`
-   Produces the `.next` output folder — your compiled app

----------

##### Stage 3 — Runner

dockerfile

```dockerfile
FROM node:20-slim AS runner
```

-   Switches to `node:20-slim` — a minimal image, much smaller than bullseye
-   Only copies what's needed to run the app — `.next`, `public`, `package.json`
-   Runs `npm install --omit=dev` — production dependencies only, no dev bloat
-   Creates a non-root user `nextjs` and switches to it — so the app never runs as root inside the container
-   Files are owned by `nextjs` user via `--chown` — no permission issues at runtime

----------

##### The key idea

Each stage does one job and throws away everything else. The final image has no source code, no build tools, no dev dependencies — just the compiled output and what's needed to run it.

```
Stage 1 → install          (discarded)
Stage 2 → build            (discarded)
Stage 3 → run only    ✅   (this is your final image)
```

----------

#### Step 2 — Build & tag with a version

```
# Build using Dockerfile.prod with a version tag
docker build -f Dockerfile.prod -t your-dockerhub-username/basic-app:v1.0.0 .
```

> Always version your images. Never rely on `latest` alone — you won't know what's actually running.

#### What is Docker Hub?

Docker Hub is a registry — a place to store and share your Docker images. Think of it like GitHub but for images. When Kubernetes needs to run your app, it pulls the image directly from here. 

If you do not have an account, please register first at docker hub. [click here](https://hub.docker.com)

----------

#### Step 3 — Push to Docker Hub

bash

```bash
# Login to Docker Hub
docker login

# Push versioned image
docker push your-dockerhub-username/basic-app:v1.0.0

# Push latest tag
docker push your-dockerhub-username/basic-app:latest
```

----------

#### Step 4 — Verify

Go to:

```
https://hub.docker.com/r/your-username/basic-app
```

You'll see both tags `v1.0.0` and `latest` listed under your repository.

#### To run your production image locally follow these steps**

```
# Step 1 - create docker-compose.prod.yml file
services:
	app:
	image: username/basic-app:v1.0.0
	ports:
		- "3000:3000"
	env_file:
		- .env.local

# Step 2 - Update package.json
"scripts": {
	"start": "next start -H 0.0.0.0 -p 3000",
},

# Step 3 - Now run docker compose using this command
docker compose -f docker-compose.prod.yml up -d

# after that check localhost:3000
# to check the difference print {process.env.NODE_ENV} in page.tsx and recreate the image and run it. 
```
 


----------

#### Your file structure now

```
your-project/
├── Dockerfile               ← development
├── Dockerfile.prod          ← production
├── docker-compose.yml       ← development
├── docker-compose.prod.yml  ← production
├── .dockerignore
├── .env.local
└── src/
```