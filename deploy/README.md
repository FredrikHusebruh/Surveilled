# Deploying Surveilled

The site has three parts:

- **Frontend on Netlify.** The built React app. Netlify also forwards every `/api/*` request to the backend, so the browser only ever talks to the Netlify address. The player cookie stays first-party and no CORS is needed.
- **Backend on an Oracle Cloud Always Free VM.** The FastAPI app runs in Docker behind Caddy, which serves HTTPS with a free automatic certificate. The address is a free `sslip.io` name built from the VM's IP (`1-2-3-4.sslip.io` for IP 1.2.3.4).
- **GitHub Actions** ([.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml)). Every pull request and push to `main` runs the backend checks (ruff, pyright, pytest) and the frontend checks (lint, build). A push to `main` that passes then deploys:
  1. The backend, only if `backend/` or `deploy/` changed.
  2. The frontend, only if `frontend/` changed.

  You can also run it by hand from the Actions tab ("Run workflow"), which deploys both.

**Every backend deploy restarts the API, and a restart forgets every player's progress for the day.** Runs live in memory. Push backend changes when few people are playing, or move runs into Supabase first.

Supabase migrations are not automated. Apply them by hand before deploying code that needs them (see "Supabase" in [.claude/CLAUDE.md](../.claude/CLAUDE.md)).

## 1. Create the Oracle VM (once)

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com). Pick a home region close to your players: free resources can only be created there, and it can't be changed later. A card is needed to verify you; Always Free resources are not charged.
2. **Compute > Instances > Create instance:**
   - Image: **Canonical Ubuntu 24.04**.
   - Shape: **Ampere > VM.Standard.A1.Flex**, 1 OCPU and 6 GB of memory. That's plenty, and well inside the free allowance.
   - Networking: keep "Assign a public IPv4 address" on.
   - SSH keys: upload your own public key (for example `~/.ssh/id_ed25519.pub`; create one with `ssh-keygen -t ed25519` if you have none). This key is for you, not for GitHub.

   If it says "Out of capacity", try another availability domain or try again later. Free Arm machines are popular.
3. Open the web ports. On the instance page, click the **subnet**, then its **Security List**, then **Add Ingress Rules**. Add two rules, both with source `0.0.0.0/0` and protocol TCP: one for destination port `80`, one for `443`.
4. Note the instance's **public IP**. The backend's address will be that IP with dashes plus `.sslip.io`: IP `141.147.10.20` becomes `141-147-10-20.sslip.io`.

## 2. Make a deploy key for GitHub (once, on your PC)

GitHub Actions logs in to the VM with its own key, separate from yours:

```sh
ssh-keygen -t ed25519 -N "" -C github-deploy -f surveilled_deploy
```

This writes `surveilled_deploy` (private, goes into GitHub) and `surveilled_deploy.pub` (public, goes onto the VM). Delete both files once step 5 is done.

## 3. Set up the VM (once)

From the repository root on your PC (replace the IP):

```sh
scp deploy/setup-vm.sh ubuntu@141.147.10.20:
ssh ubuntu@141.147.10.20 "sudo bash setup-vm.sh '$(cat surveilled_deploy.pub)'"
```

The script installs Docker, creates a `deploy` user for GitHub Actions, opens ports 80 and 443 in the VM's firewall, and creates `/opt/surveilled/backend.env` with a new random daily salt. Then:

1. Add the Supabase settings. Use the `sb_secret_...` key; this file never leaves the server:
   ```sh
   ssh ubuntu@141.147.10.20
   sudo -u deploy nano /opt/surveilled/backend.env
   ```
2. **Back up `SURVEILLED_DAILY_SALT`** from that file in a password manager. If the VM is lost along with it, every day's records change.

## 4. Create the Netlify site (once)

1. At [app.netlify.com](https://app.netlify.com): **Add new project > Deploy manually**, and drop any small folder (one `index.html` will do). GitHub Actions replaces it on the first deploy. Don't connect the Git repository to Netlify: the workflow deploys, so it only publishes code that passed the checks, and only after the backend.
2. **Project configuration > General:** copy the **Project ID** (the site ID). Rename the site here if you like.
3. **User settings > Applications > Personal access tokens > New access token:** create one and copy it.

## 5. Add the settings to GitHub (once)

In the repository on GitHub: **Settings > Secrets and variables > Actions**.

| Kind | Name | Value |
|---|---|---|
| Variable | `VM_HOST` | The VM's public IP, e.g. `141.147.10.20` |
| Variable | `API_HOST` | The sslip address, e.g. `141-147-10-20.sslip.io` |
| Secret | `VM_SSH_KEY` | The whole contents of `surveilled_deploy` (the private key) |
| Secret | `VM_KNOWN_HOSTS` | The output of `ssh-keyscan -t ed25519 141.147.10.20`, run from your PC |
| Secret | `NETLIFY_AUTH_TOKEN` | The Netlify access token |
| Secret | `NETLIFY_SITE_ID` | The Netlify Project ID |

`VM_KNOWN_HOSTS` pins the VM's identity, so a deploy refuses to send anything to a machine pretending to be it.

## 6. Deploy

Merge or push to `main`, or open **Actions > CI/CD > Run workflow** on `main`. The first backend deploy takes a few minutes while Docker builds the image and Caddy gets the certificate. Then open the Netlify address.

## Day to day

- **Logs:** `ssh ubuntu@<ip>`, then `cd /opt/surveilled/deploy && sudo docker compose logs -f api`. The `surveilled.results` lines are the anonymous results used to tune difficulty.
- **Change a setting:** edit `/opt/surveilled/backend.env`, then `sudo docker compose up -d` in `/opt/surveilled/deploy`. This restarts the API, so runs are lost.
- **New IP:** if the VM's IP changes, update `VM_HOST`, `API_HOST` and `VM_KNOWN_HOSTS` in GitHub and run the workflow by hand.
- **Before launch:** put the real name and contact email in `PRIVACY_CONTACT` in [frontend/src/game/privacy.ts](../frontend/src/game/privacy.ts), and apply the one-year retention migration (`20261118120000_day_results_retention.sql`) with `db push`.
- **Before real players arrive:** clear the seeded standings (`uv run python -m scripts.seed_standings --clear` from `backend/` in dev mode), or use a separate Supabase project for production.
