# Cloud Native Games

A purple, white and charcoal retro athletics demo for Nutanix Kubernetes Platform. Browser-based athletics with a solo 100m sprint and a local two-player VS race, original canvas artwork, keyboard/touch controls, false starts and solo personal bests stored in the browser.

## Run locally

Requires Node.js 22 or newer. No npm install is needed.

```sh
npm start
```

Open http://localhost:8080 and choose a game from the menu:

- **100m Sprint:** the original solo race. Select Start race, wait three seconds for GO, then alternate A/L or the left/right arrow keys. Touch players use the two step buttons. Solo personal bests remain stored in that browser.
- **VS Race:** two players on one keyboard/shared screen. Player 1 (white) alternates **A/S**; Player 2 (gold) alternates **K/L**. Both start on the same GO, and the first to 100m wins. A false start awards the race to the other player; equal finish times within one millisecond produce a dead heat. Each player also has separate touch buttons. VS results do not change solo personal bests.

Use Game menu to switch events; switching resets the current race. Held keys and repeated presses of the same side do not accelerate an athlete. Hiding the browser tab resets an active race. VS is local multiplayer, so no second browser, network session, or backend service is required.

```sh
npm run check
npm test
docker build -t cloud-native-games:local .
docker run --rm -p 8080:8080 cloud-native-games:local
```

## Delivery flow

Application commit → GitHub Actions tests → multi-architecture image in GHCR → exact image digest committed into `deploy/overlays/demo/kustomization.yaml` → NKP GitOps reconciles that directory → Kubernetes rolling update.

CI never calls the cluster API. Manifest-only commits are reconciled without an image build. The digest update does not start another build. Application version and build commit are available at `/version.json` and displayed in the footer. `DEMO_BANNER` is a pod environment variable that can be changed declaratively in the Deployment.

## Connect NKP GitOps

The repository deploys the application and an HTTP LoadBalancer Service into the target namespace selected in NKP GitOps. The manifests intentionally omit a fixed namespace, so the same repository can be used across clusters and projects. It does not create a namespace or install Flux.

Use these settings in NKP's existing GitOps application/source configuration:

| Setting | Value |
|---|---|
| Repository URL | `https://github.com/stu-10/nkp-track-field-demo.git` |
| Branch | `main` |
| Application path | `./` (repository root) |
| Target namespace | Select the existing project namespace for that cluster in NKP |
| Git authentication | Public repository; no credential required |
| Registry authentication | Public GHCR image; no image-pull secret required |
| Reconciliation | Enable pruning and wait/health checks where supported |

If NKP separates adding a Git repository from creating an application, add the repository first, then select the branch and application path above. Connecting a URL alone does not select which manifests to reconcile.

The root `kustomization.yaml` includes the prepared demo overlay. If an existing NKP connection already uses `./deploy/overlays/demo`, that path continues to render the same application.

### Already completed

- Application committed to `main`, with automated tests and a publishing workflow.
- Published image available anonymously from `ghcr.io/stu-10/nkp-track-field-demo`, with Linux amd64 and arm64 variants.
- Deployment overlay pins the published image by SHA-256 digest; no bootstrap image is used by this overlay.
- Deployment configured with two replicas, resource limits, health probes, a non-root user, and a read-only filesystem.
- Service configured as `LoadBalancer`, exposing HTTP port 80 to application port 8080.
- Overlay leaves namespace assignment to NKP GitOps without creating or managing a namespace.
- Manifest rendering checked locally and registered as a GitHub Actions check.

No manual first publish, registry secret, ingress, DNS record, TLS certificate, or additional Flux installation is needed for HTTP access through the LoadBalancer address. Optional ingress and Flux examples are outside the application path and are not applied by this connection.

### Cluster requirements

NKP must provide the selected project namespace and configure its GitOps application to apply resources into that namespace (Flux `spec.targetNamespace` or the equivalent NKP setting). Omitting namespace fields alone does not select the destination; confirm the application target namespace in NKP. The GitOps reconciler must have permission to manage Deployments and Services there. A configured load balancer implementation and address pool or cloud provider must allocate an address reachable from your client network. Cluster egress must reach GitHub and GHCR; routing and firewall rules must permit inbound TCP port 80. These cluster-specific capabilities cannot be supplied by this application repository and have not been verified against your cluster.

For an isolated cluster, mirror the image and Git source into reachable services before connecting. If you require a custom hostname and HTTPS, configure the optional ingress example with your controller, DNS and TLS settings separately; the default LoadBalancer endpoint serves HTTP.

### After connecting

```sh
# Set this to the target namespace selected in NKP for this cluster.
NKP_NAMESPACE="your-project-namespace"
kubectl -n "$NKP_NAMESPACE" rollout status deployment/cloud-native-games
kubectl -n "$NKP_NAMESPACE" get svc cloud-native-games --watch
```

Once `EXTERNAL-IP` shows an IP address or hostname, open `http://<external-ip-or-hostname>/`. The endpoint `http://<external-ip-or-hostname>/healthz` should return `ok`.

If the address stays `<pending>`, inspect the Service events with `kubectl -n "$NKP_NAMESPACE" describe svc cloud-native-games` and check the cluster's load balancer configuration. A private address is reachable only from connected networks. Temporary access is available through `kubectl -n "$NKP_NAMESPACE" port-forward svc/cloud-native-games 8080:80`.

### Future application changes

The publishing workflow tests the app, publishes a multi-architecture GHCR image, and commits its exact digest to the overlay. GitHub Actions has already written the initial digest successfully. Keep its package-write and repository-write permissions enabled and preserve the GHCR package's public visibility. Branch rules must permit the workflow's digest commit; if you later prohibit bot pushes, adapt delivery to deployment pull requests. Manifest-only changes are reconciled directly without rebuilding the application.

## Files

- `app/`: static game and simulation module.
- `server.mjs`: dependency-free HTTP server with allowlisted assets, health and version endpoints.
- `Dockerfile`: non-root Node container; no build step or runtime packages.
- `deploy/`: Kubernetes base and demo overlay, resource limits and health probes.
- `gitops/`: version-dependent Flux connection example.
- `.github/workflows/publish.yaml`: CI and digest updates.
- `docs/demo-runbook.md`: presentation steps and environment checklist.

## Verification status

JavaScript syntax checks and all eleven simulation/HTTP tests pass. The pinned public image was pulled and its game, health and version endpoints were exercised under the Deployment's non-root, read-only filesystem and dropped-capability settings. The NKP overlay renders successfully with only a Deployment and LoadBalancer Service, both without fixed namespace fields.

NKP reconciliation, Kubernetes server-side admission, external address allocation require the target cluster/client and have not been verified here. Local Chromium checks cover solo and VS racing, key mappings, false starts, replay, menu switching and touch controls.

## Next releases

Hurdles and long jump; optional shared leaderboard API and database; optional real workload metrics. The UI's platform chips describe the intended architecture, not live cluster telemetry. The artwork and game logic are original. The header uses the supplied white Nutanix SVG logo, sized proportionally for desktop and mobile.

Technical references:
- https://fluxcd.io/flux/components/kustomize/kustomizations/
- https://fluxcd.io/flux/components/source/gitrepositories/
- https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
