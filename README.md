
# Docker And Kubernetes For Absolute Beginners

## System Requirements

- 4 GB RAM minimum (8 GB recommended)
- Virtualization must be enabled in BIOS/UEFI
- ~1 GB disk space for Docker Desktop
-  **OS:** Windows 10/11 (64-bit)

### Installation

- [Download Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)
- Install WSL (Windows Subsystem for Linux):
```wsl --install ```
> Restart your machine after WSL installs. ---

# Config Docker

### Step 1 — Create a `Dockerfile` in your project root

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**Breaking it into pieces:**
-  `FROM node:22-alpine` — use Node 22 LTS (stable, long-term support)
-  `WORKDIR /app` — work inside a folder called `/app` inside the container
-  `COPY package.json ...` — copy your package files in first
-  `RUN npm install` — install dependencies
-  `COPY . .` — copy the rest of your project files
-  `EXPOSE 3000` — tell Docker your app uses port 3000
-  `CMD ["npm", "run", "dev"]` — start the app

### Step 2 — Create a `.dockerignore` in your project root

```ignore
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

```bash
# 1. Build the image (do this once, and again when you change dependencies)
docker  build  -t  basic-app  .

# 2. Run the container
docker  run  --rm  -p  3000:3000  --env-file  .env.local  basic-app

# 3. Open your browser and visit:
# http://localhost:3000
```

**Breaking it into pieces:**

-  `docker run` Start a new container
-  `--rm` Without this flag, when a container stops, it remains on your host machine in an "Exited" state.
-  `-p 3000:3000` Map port 3000 on your machine → port 3000 inside the container
-  `--env-file .env.local` Read your `.env.local` file and inject every variable into the container
-  `basic-app`The image name to run (what you built with `docker build -t basic-app .`)

### Step 5 --- Simplify with docker compose file

Create a `docker-compose.yml` in your project root
```yml
# docker-compose.yml
services:
	app:
		build: .
		ports:
			- "3000:3000"
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

-  `services:` Defines what containers to run
-  `app:` Name of your container (you can call it anything)
-  `build: .` Build the image from the `Dockerfile` in the current folder
-  `ports: "3000:3000"` Same as `-p 3000:3000` in `docker run`
-  `env_file: .env.local` Same as `--env-file .env.local` in `docker run`
-  `volumes` The volume syncs your code live into the container
-  `.:/app` The dot `.` means your current project folder on your machine. `/app` is the folder inside the container. This line says — _"keep these two folders in sync, whatever I change locally, reflect it inside the container instantly."_ This is what makes HMR possible.
-  `/app/node_modules` Without this line, the volume above would overwrite the container's `node_modules` with your local one (built for Windows) and break things. This line says — _"for node_modules specifically, ignore what's on my machine and keep the container's own copy."_

The polling variables make the file watcher work inside Docker on Windows/Mac, and together they give you HMR.

### Commands

```bash
# Start your app
docker  compose  up

# Start in background (detached mode)
docker  compose  up  -d

# Rebuild image and start (run this when you change dependencies)
docker  compose  up  --build

# Stop your app
docker  compose  down

# Stop your app and clear volumes
docker  compose  down  -v
```

**vs what you were doing before**
| Before | Now |
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
|Delete container|`docker rm <container_id>`|
|Clean up all container|`docker container prune -a`|
|Watch running projects|`docker compose ps`|
|Watch logs|`docker compose logs`|
| Watch live logs | `docker compose logs -f` |
|See logs of a specific service |`docker compose logs <app_name>`|
|See last 50 (change the number according to need) lines only| `docker compose logs --tail=50`|
|Image rename OR add or update tag|`docker tag old-image-name:latest new-image-name:v1.0.0`|
  
------
# Production Dockerfile

#### Why do we need a production ready Dockerfile?

Your dev Dockerfile is built for convenience — it runs `npm run dev`, includes dev dependencies, and prioritizes speed over everything else. That's fine locally but wrong for production.

A production Dockerfile should be:
-  **Small** — no source code, no dev tools, no unnecessary files
-  **Fast** — pre-built, just runs the output
-  **Secure** — less code in the image means smaller attack surface

#### What is a multi-stage build?

A multi-stage build uses multiple `FROM` steps in one Dockerfile. Each stage does one job and passes only what's needed to the next. The final image ends up lean because it only contains the output — not the tools used to build it.

```
Stage 1 (deps) → install dependencies
Stage 2 (builder) → build the app
Stage 3 (runner) → run the built app only
```

#### Step 1 — Create `Dockerfile.prod` in your project root

```dockerfile
# Stage 1 — Dependencies
FROM node:20-bullseye AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2 — Build
FROM node:20-bullseye AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3 — Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
&& adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
RUN npm install --omit=dev

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

#### What is happening in `Dockerfile.prod`

##### Stage 1 — Dependencies

```dockerfile
FROM node:20-bullseye AS deps
```

- Uses full Debian environment — better compatibility when installing packages that need to compile native code
-  `npm ci` instead of `npm install` — installs exactly what's in `package-lock.json`, no version drift, no surprises
----------

##### Stage 2 — Build

```dockerfile
FROM node:20-bullseye AS builder
```

- Copies `node_modules` from Stage 1 — no reinstalling
- Copies your source code and runs `npm run build`
- Produces the `.next` output folder — your compiled app

----------

##### Stage 3 — Runner

```dockerfile
FROM node:20-slim AS runner
```

- Switches to `node:20-slim` — a minimal image, much smaller than bullseye
- Only copies what's needed to run the app — `.next`, `public`, `package.json`
- Runs `npm install --omit=dev` — production dependencies only, no dev bloat
- Creates a non-root user `nextjs` and switches to it — so the app never runs as root inside the container
- Files are owned by `nextjs` user via `--chown` — no permission issues at runtime
- 
----------

##### The key idea

Each stage does one job and throws away everything else. The final image has no source code, no build tools, no dev dependencies — just the compiled output and what's needed to run it.

```
Stage 1 → install (discarded)
Stage 2 → build (discarded)
Stage 3 → run only ✅ (this is your final image)
```

----------

#### Step 2 — Build & tag with a version

```bash
# Build using Dockerfile.prod with a version tag
docker  build  -f  Dockerfile.prod  -t  your-dockerhub-username/basic-app:v1.0.0  .
```

> Always version your images. Never rely on `latest` alone — you won't know what's actually running.

#### To run your production image locally follow these steps**

```bash
# Step 1 - create docker-compose.prod.yml file at root
services:
	app:
		image:  username/basic-app:v1.0.0
		ports:
			-  "3000:3000"
		env_file:
			-  .env.local

# Step 2 - Update package.json
"scripts":  {
"start":  "next start -H 0.0.0.0 -p 3000",
},

# to check the difference print {process.env.NODE_ENV} in page.tsx and recreate the image and run it.

# Step 3 - Now run docker compose using this command
docker  compose  -f  docker-compose.prod.yml  up  -d

# after that check localhost:3000
```

-----

## Nginx

#### What is Nginx?
Nginx is a web server and reverse proxy server. It is commonly used to handle incoming traffic and forward requests to backend applications like Node.js, Next.js, Python, or Java applications.

In simple words:

> Nginx sits in front of your application and controls how requests reach your app.

----------

#### Why are we configuring Nginx in this guide?
The main purpose of this guide is to understand how applications are deployed in real production environments.

In development, we usually access applications directly like this:
```
localhost:3000
```
But in production, applications are usually placed behind a reverse proxy like Nginx.

Instead of users directly accessing the application container or process, requests first go to Nginx, and then Nginx forwards those requests to the application.

This helps us understand how real-world deployments work on cloud servers and VPS environments.

#### Is Nginx used locally?

Usually, Nginx is installed and configured on:
-   Cloud servers
-   VPS servers
-   Linux production machines

Examples:
-   AWS EC2
-   DigitalOcean Droplets
-   Azure VM
-   Google Cloud VM

In production deployments, Nginx commonly handles:
-   Reverse proxy
-   SSL/HTTPS
-   Load balancing
-   Routing traffic
-   Serving static files

In this guide, we are using Nginx locally only for learning purposes so we can understand how production systems work.

-----

### Setup reverse proxy using Nginx

#### Step 1: Update `docker-compose.prod.yml` file

```yml
services:
	app:
		image: username/basic-app:v1.0.3
		# remove ports from app service
		# ports:
		#--- - "3001:3001"

		env_file:
			- .env.local

# additional service
	nginx:
		image: nginx:latest
		container_name: nginx
		ports:
			- "80:80"
		volumes:
			- ./nginx/nginx.conf:/etc/nginx/nginx.conf
		depends_on:
			- app
```

**Breaking into pieces:**

-  `ports` remove from the **app service** because we don’t want the app to be directly accessible from the browser.
- `nginx:` We create an Nginx service because in real production systems, Nginx always runs as a separate service in front of the application, so we replicate the same architecture using Docker to understand real-world deployments.

#### Step 2: Create `nginx/nginx.conf` at project root

```
events {}

http {  
	server {    
		listen 80;
		location / {      
			proxy_pass http://app:3000;
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade;
			proxy_set_header Connection "upgrade";    
		}  
	}
}
```

**Breaking into pieces:**
- `listen 80` This tells Nginx to listen for incoming HTTP requests on port 80. Port 80 is the default port for HTTP traffic.
- `location /` For all incoming routes and requests, use this configuration.
	Examples:
	-   `/`
	-   `/about`
	-   `/products`
- `proxy_pass` Forward incoming requests to the application running on port 3000.
	Here:
	-   `app` is the application container or service name
	-   `3000` is the application port

#### Run docker compose
```bash
# this will run you docker compose prod file
docker compose -f docker-compose.prod.yml up -d

# check http://localhost

# to close service use
docker compose down -v --remove-orphans
# --remove-orphans : without this flag nginx container will remain active 
```
-----
#### How Reverse Proxy Works

Without Nginx:
```
Browser → Application
```
With Nginx:
```
Browser → Nginx → Application
```
The user only talks to Nginx.
Nginx then forwards the request to the backend application.
The application response comes back through Nginx to the user.

#### Why Reverse Proxy is Useful

Using a reverse proxy provides many benefits in production environments.

- **Better Security** : Users do not directly access the application process or container. Nginx acts as a middle layer.
- **SSL/HTTPS Handling** : Nginx is commonly used to configure HTTPS and SSL certificates.
	Example: ``` https://example.com ```
- **Load Balancing** : Nginx can distribute traffic across multiple application servers.
	Example:``` User Requests      ↓    Nginx   ↙  ↓  ↘App 1 App 2 App 3```
- **Better Production Architecture** : Nginx helps separate:
	-   traffic handling
	-   routing
	-   SSL
	-   application logic

-----------

### Setup Nginx load balancer

#### Step 1: Update `nginx/nginx.conf` for Load Balancing

Now we need to tell Nginx about multiple application containers.
Update the Nginx configuration:

```
events {}

http {  
	# addition
	resolver 127.0.0.11 valid=10s;
	
	upstream app {
		zone app 64k;
		least_conn;
		server app:3001 resolve;
	}
	# --------
	server {    
		listen 80;
		location / {      
			proxy_pass http://app; # remove port
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade;
			proxy_set_header Connection "upgrade";
			proxy_set_header Host $host;
			proxy_set_header X-Real-IP $remote_addr;
			proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		}  
	}
}
```

**Breaking into pieces:**
- `events {}` Required block in every Nginx config. Left empty = Nginx manages connections with default settings.
- `upstream` block defines a group of backend servers.
- `resolver 127.0.0.11 valid=10s` Tells Nginx to use Docker's internal DNS server to look up hostnames
	-   `valid=10s` = re-check DNS every 10 seconds
	-   This is what allows Nginx to discover all 3 app container IPs instead of caching just one
- `upstream app` block
	-   Defines the group of backend servers Nginx will forward traffic to
	-   `zone app 64k` — allocates 64kb of shared memory so all Nginx worker processes share the same upstream state
	-   `least_conn` — sends each new request to whichever container has the **fewest active connections** (smarter than round-robin)
	-   `server app:3001 resolve` — the `resolve` flag tells Nginx to **keep re-resolving** the `app` hostname dynamically, picking up new/removed containers automatically
- `server` block
	-   Defines a virtual server listening on port 80
	-   This is the entry point for all incoming HTTP traffic
- `location /` block — the proxy rules
	-   `proxy_pass http://app` — forward all requests to the upstream group defined above
	-   `proxy_http_version 1.1` — use HTTP/1.1 (required for keepalives and WebSockets)
	-   `Upgrade` + `Connection "upgrade"` — WebSocket support headers
	-   `Host $host` — forwards the original domain name to the app
	-   `X-Real-IP` — tells your app the **real client IP**, not Nginx's internal IP
	-   `X-Forwarded-For` — appends client IP to a chain (useful if there are multiple proxies)

----------

#### Scaling the Application
Docker Compose allows us to create multiple containers of the same service.
Run the following command:
```bash
docker compose -f docker-compose.prod.yml up -d --scale app=3
```
This creates:
```
app-1app-2app-3
```

You can verify using:
```
docker ps
```

to check load balancer is working API to check serving hostname
```
# path : app/api/instance/route.js
export  async  function  GET() {
	return  Response.json({
		instance:  process.env.HOSTNAME || "unknown",
	});
}
# cmd : curl http://localhost/api/instance
# Total number of instances three, So every time you hit api you will get different hostname
```

#### Important Limitation of Docker Compose Scaling

Docker Compose scaling is mainly useful for:
-   Learning
-   Development
-   Small environments

In real production systems, orchestration tools like:

-   Kubernetes
-   Docker Swarm

are commonly used for advanced scaling, self-healing, and automatic load balancing.
Each new request may go to a different container.

----

#### What is Docker Hub?

Docker Hub is a registry — a place to store and share your Docker images. Think of it like GitHub but for images. When Kubernetes needs to run your app, it pulls the image directly from here.

If you do not have an account, please register first at docker hub. [click here](https://hub.docker.com)

----------

#### Step 3 — Push to Docker Hub

```bash
# Login to Docker Hub
docker  login

# Push versioned image
docker  push  your-dockerhub-username/basic-app:v1.0.0
```

----------

#### Step 4 — Verify

Go to:
```
https://hub.docker.com/r/your-username/basic-app
```

You'll see both tags `v1.0.0` listed under your repository.




----------

#### Your file structure now

```
your-project/
├── nginx/nginx.conf ← reverse proxy && load balancer
├── Dockerfile ← development
├── Dockerfile.prod ← production
├── docker-compose.yml ← development
├── docker-compose.prod.yml ← production
├── .dockerignore
├── .env.local
└── app/
```

# CI/CD Pipeline with GitHub Actions

#### What is a CI/CD Pipeline?

Without a pipeline your release process looks like this:

```
make changes → build image manually → push to Docker Hub manually → repeat every time
```

With a pipeline it becomes:

```
make changes → push a tag → everything else happens automatically
```

CI/CD stands for Continuous Integration and Continuous Delivery. In plain English — every time you're ready to release, one command triggers the entire build and delivery process without you touching anything manually.

----------

#### Setting up GitHub Secrets

Go to your repo → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

```
DOCKER_USERNAME  → your Docker Hub username
DOCKER_PASSWORD  → your Docker Hub access token
```

> Use an access token not your actual password. Generate one at Docker Hub → Account Settings → Security → New Access Token.

----------

####  Create a docker-build.yml in Github action
```yml
name: Build & Push Docker Image

on:
	push:
		tags:
			- 'v*.*.*'

jobs:
	build:
		runs-on: ubuntu-latest

		steps:
			- name: Checkout code
			uses: actions/checkout@v4
			
			- name: Set up Docker Buildx
			uses: docker/setup-buildx-action@v3

			- name: Login to Docker Hub
			uses: docker/login-action@v3
			with:
				username: ${{ secrets.DOCKER_USERNAME }}
				password: ${{ secrets.DOCKER_PASSWORD }}

			- name: Build & push image
			uses: docker/build-push-action@v5
			with:
				context: .
				file: ./Dockerfile.prod
				push: true
				tags: ${{ secrets.DOCKER_USERNAME }}/basic-app:${{ github.ref_name }}
				cache-from: type=gha
				cache-to: type=gha,mode=max
```

#### How to trigger a release

```bash
# finish your work, merge to main, then:
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

That's it. GitHub Actions takes over — builds your production image and pushes `username/basic-app:v1.0.0` to Docker Hub automatically.

----------

#### Your complete release flow

```
Write code
    ↓
Open PR → get reviewed → merge to main
    ↓
git tag v1.x.x
    ↓
git push origin v1.x.x
    ↓
GitHub Actions triggers
    ↓
Builds image using Dockerfile.prod
    ↓
Pushes username/basic-app:v1.x.x to Docker Hub
    ↓
Kubernetes pulls new image (next section)
```

# Kubernetes
