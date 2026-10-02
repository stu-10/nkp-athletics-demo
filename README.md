# Cloud Native Games

A purple, white and charcoal browser athletics demo for Nutanix Kubernetes Platform (NKP). Choose **100m Sprint**, **VS Race**, or **Long Jump**, play with keyboard or touch controls, and submit your name and company to the event's shared leaderboard.

## Run locally

Requires **Node.js 24 or newer**. The app uses Node's built-in HTTP server and SQLite module; no npm install or separate database service is needed.

```sh
npm start
```

Open `http://localhost:8080` in your browser. The server listens on port 8080 by default. Set `PORT` to use another port. Choose an event from the game menu, select **Start race** or **Start attempt**, and wait for the three-second countdown to reach GO.

### Events and controls

| Event | Keyboard controls | Goal | Leaderboard |
|---|---|---|---|
| **100m Sprint** | Alternate **A / L** or **← / →** | Finish 100m as quickly as possible | Fastest times first |
| **VS Race** | Player 1 (white): **A / S**; Player 2 (gold): **K / L** | First player to reach 100m wins | Fastest qualifying finish times first |
| **Long Jump** | Alternate **A / L** or **← / →**, then **Space** to jump | Build speed and jump just before the take-off board | Longest distances first |

All events have touch step buttons; Long Jump also has a **JUMP** button. Held keys and repeated presses of the same side do not add speed. Steady alternating steps build speed, and the athlete slows without input.

**100m Sprint:** taking a step before GO causes a false start. Your best sprint time is saved in that browser.

**VS Race:** two players share one keyboard or touch screen and the same starting gun. A false start awards the race to the other player. Finish times within one millisecond produce a dead heat. The race stops at the first finish; only players who actually reach 100m may submit a time. A dead heat offers both players a submission form. VS results do not change your solo personal best.

**Long Jump:** accelerate along the 30m runway, then press Space just before the white take-off board. A prompt appears near the board to help time the jump. More speed and a take-off closer to the board produce a longer jump. The athlete follows a flight arc, and the landing distance is measured from the board in metres. Crossing the board without jumping is a foul. Jumping so early that you miss the sand also gives no valid distance. Input before GO causes a false start. Jump personal bests are stored separately from sprint times.

Use **Game menu** to switch events. Switching events or hiding the browser tab cancels an active attempt. Opening the leaderboard during an attempt also cancels it; start a fresh attempt after closing the leaderboard. VS multiplayer is local; players do not need a second browser or a network session.

## Shared leaderboards

Each game has a **Leaderboard** button showing its top 100 submitted results. Sprint and VS rank by time ascending; Long Jump ranks by distance descending. Rankings use full-precision values, while the display shows two decimal places.

After a qualifying finish or landing, **name and company inputs appear in the main result overlay beside your time or distance**. Select **Submit time** or **Submit distance** to save the result. Submissions are optional, and names and companies are visible to everyone using the app. False starts, foul jumps, and unfinished VS players have no qualifying result. Replaying hides the previous submission forms.

Results are shared across browsers and persist across server restarts. Browser personal bests remain separate from the shared rankings. Duplicate retries of the same submission do not create another entry.

### Storage and configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP server port |
| `LEADERBOARD_DB` | `./data/leaderboard.sqlite` | SQLite database file; its directory must be writable |
| `DEMO_BANNER` | `Built to run anywhere. Powered by NKP.` | Platform banner text |
| `APP_VERSION` | `0.1.0` | Version shown in the footer and `/version.json` |
| `APP_COMMIT` | `local` | Build commit shown in the footer and `/version.json` |

The server creates the database and required tables automatically. The local `data/` directory is ignored by Git and excluded from Docker images. Long Jump uses a separate table in the same database, preserving existing Sprint and VS records. No database credentials are required. Back up the database file with the server stopped to preserve results safely.

The leaderboards are intended for a trusted demo: results are supplied by the browser and are not independently verified. There is no authenticated player identity or moderation interface.

## Checks and container development

```sh
npm run check
npm test
docker build -t cloud-native-games:local .
```

For persistent container results, create a named volume and make it writable by the app's non-root user:

```sh
docker volume create cloud-native-games-data
docker run --rm --user 0 \
  -v cloud-native-games-data:/data \
  cloud-native-games:local chown 1000:1000 /data
docker run --rm --read-only -p 8080:8080 \
  -e LEADERBOARD_DB=/data/leaderboard.sqlite \
  -v cloud-native-games-data:/data \
  cloud-native-games:local
```

The volume retains leaderboard results after the container stops. Removing the volume removes those results. A read-only container needs the writable database mount shown above.

## Delivery flow

Application commit → GitHub Actions tests → multi-architecture image in GHCR → exact image digest committed into `deploy/overlays/demo/kustomization.yaml` → NKP GitOps reconciliation → replacement of the application pod.

The publishing workflow targets `ghcr.io/stu-10/nkp-athletics-demo` for Linux amd64 and arm64. CI never calls the cluster API. Manifest-only commits are reconciled without an image build, and the digest update does not start another build. Keep the workflow's package-write and repository-write permissions enabled and preserve the GHCR package's public visibility. Branch rules must permit the workflow's digest commit; if bot pushes are prohibited, adapt delivery to deployment pull requests.

## Connect NKP GitOps

The repository deploys a **Deployment**, **HTTP LoadBalancer Service**, and **leaderboard PersistentVolumeClaim**. The manifests omit a fixed namespace, so NKP selects the target project namespace. They do not create a namespace or install Flux.

| Setting | Value |
|---|---|
| Repository URL | `https://github.com/stu-10/nkp-athletics-demo.git` |
| Branch | `main` |
| Application path | `./` (repository root) |
| Target namespace | Select the existing project namespace in NKP |
| Git authentication | Public repository; no credential required |
| Registry authentication | Public GHCR image; no image-pull secret required |
| Reconciliation | Enable pruning and wait/health checks where supported; preserve the leaderboard PVC when removing the application |

If NKP separates adding a Git repository from creating an application, add the repository first, then select the branch and application path. Connecting a URL alone does not select which manifests to reconcile. The root `kustomization.yaml` includes the demo overlay; `./deploy/overlays/demo` also renders the same resources.

### Runtime and storage requirements

- One application replica, running as UID/GID 1000 with resource limits, health probes, dropped capabilities, and a read-only root filesystem.
- A **1Gi ReadWriteOnce PVC**, `cloud-native-games-leaderboard`, mounted at `/data`. The pod uses `fsGroup: 1000` for volume access.
- A default StorageClass capable of provisioning the PVC, with volume permissions compatible with UID/GID 1000.
- A **Recreate** deployment strategy so one server owns the SQLite database. Updates briefly interrupt service. To run multiple replicas, migrate to an external database first.
- A LoadBalancer implementation and address pool or cloud provider that can allocate a reachable address. The Service exposes HTTP port 80 to application port 8080.
- GitOps permissions to manage Deployments, Services, and PVCs in the selected namespace. Configure the reconciler's target namespace explicitly.
- Cluster egress to GitHub and GHCR, and routing/firewall rules permitting inbound TCP port 80.

Results survive pod replacement. **Deleting the PVC removes the stored leaderboard results**; protect it when pruning or removing the application and arrange backups as needed.

Optional ingress and Flux examples are outside the application path. A custom hostname and HTTPS require your controller, DNS, and TLS configuration. For an isolated cluster, mirror the image and Git source into reachable services before connecting.

### After connecting

```sh
# Use the target namespace selected in NKP.
NKP_NAMESPACE="your-project-namespace"
kubectl -n "$NKP_NAMESPACE" get pvc cloud-native-games-leaderboard
kubectl -n "$NKP_NAMESPACE" rollout status deployment/cloud-native-games
kubectl -n "$NKP_NAMESPACE" get svc cloud-native-games --watch
```

Once `EXTERNAL-IP` shows an address, use that LoadBalancer endpoint to access the app. `/healthz` should return `ok`, and `/version.json` identifies the running build.

If the PVC stays `Pending`, inspect its events and the default StorageClass. If the Service address stays `Pending`, inspect the Service events and load balancer configuration. A private address is reachable only from connected networks. For temporary local access:

```sh
kubectl -n "$NKP_NAMESPACE" port-forward svc/cloud-native-games 8080:80
```

## Files

- `app/index.html`, `app/style.css`, `app/game.js`: event menu, canvas artwork, controls, result forms, and leaderboard views.
- `app/race.js`: solo and VS sprint simulations.
- `app/long-jump.js`: run-up, take-off, flight, landing, and foul rules.
- `server.mjs`: HTTP server, allowlisted assets, health/version endpoints, and leaderboard API.
- `leaderboard.mjs`: SQLite storage, input validation, event rankings, and duplicate submission handling.
- `tests/`: simulation, HTTP, leaderboard, migration, and persistence tests.
- `Dockerfile`: non-root Node 24 container with no dependency installation step.
- `deploy/`: Kubernetes application, Service, persistent storage, and image overlay.
- `.github/workflows/`: application tests, image publishing/digest updates, and manifest validation.
- `gitops/`: optional Flux connection example.
- `docs/demo-runbook.md`: presentation notes and environment checklist.

## Verification status

JavaScript syntax checks and all **19 automated tests** passed during development. They cover sprint and VS behavior, long-jump acceleration and timing, flight and distance measurement, false starts/fouls, HTTP asset serving, leaderboard validation and ordering, event separation, duplicate submissions, preservation of existing records, and persistence after server restart.

Local Chromium checks exercised full keyboard and touch jumps, result submissions, shared distance rankings, foul exclusion, mobile layout, attempt cancellation, and switching between all three events. Earlier checks also covered Sprint/VS submissions and layouts. The container's non-root/read-only setup with writable storage and persistence after restart was verified while adding the leaderboards. Kubernetes manifests rendered successfully locally.

NKP reconciliation, server-side admission, storage provisioning, and external address allocation require the target cluster and have not been verified here. A pushed commit or local check does not establish that the latest build is running in that cluster.

## Future events

Hurdles and additional athletics events; optional workload metrics and leaderboard moderation. The UI's platform chips describe the intended architecture, not live cluster telemetry. The artwork and game logic are original, and the header uses the supplied white Nutanix SVG logo.

## Technical references

- https://fluxcd.io/flux/components/kustomize/kustomizations/
- https://fluxcd.io/flux/components/source/gitrepositories/
- https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
