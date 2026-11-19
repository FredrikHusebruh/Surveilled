#!/usr/bin/env bash
# One-time setup of a fresh Oracle Cloud Ubuntu VM for Surveilled. Run it on the VM as root:
#
#   sudo bash setup-vm.sh "ssh-ed25519 AAAA... github-deploy"
#
# The argument is the PUBLIC half of the key GitHub Actions deploys with. The script:
#   - installs Docker (with Compose) and rsync,
#   - creates a `deploy` user that only GitHub Actions logs in as,
#   - opens ports 80 and 443 in the VM's own firewall (Oracle's Ubuntu images block them),
#   - creates /opt/surveilled/backend.env with a fresh random daily salt, if it doesn't exist yet.
# It is safe to run again: it never overwrites backend.env.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash setup-vm.sh \"<deploy public key>\"" >&2
  exit 1
fi
if [[ $# -ne 1 || $1 != ssh-* ]]; then
  echo "Pass the deploy key's public half, starting with ssh-ed25519." >&2
  exit 1
fi
deploy_key=$1

echo "==> Installing Docker, Compose and rsync"
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q docker.io docker-compose-v2 rsync \
  iptables-persistent
systemctl enable --now docker

echo "==> Creating the deploy user"
if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
# The docker group can run containers, which is as powerful as root on this machine. That is the
# point of this single-purpose VM: GitHub Actions deploys as this user and nothing else.
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$deploy_key" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

echo "==> Preparing /opt/surveilled"
install -d -m 755 -o deploy -g deploy /opt/surveilled
env_file=/opt/surveilled/backend.env
if [[ ! -f $env_file ]]; then
  salt=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  cat > "$env_file" <<EOF
# Production settings for the Surveilled API. Lives only on this server; never commit it.

# Secret mixed into the daily seeds. Back it up somewhere safe (a password manager): if this server
# is lost and the salt with it, every day's records change.
SURVEILLED_DAILY_SALT=$salt

SURVEILLED_LAUNCH_DAY=2026-11-16
SURVEILLED_COOKIE_SECURE=true
SURVEILLED_DEV_MODE=false

# Fill these in from the Supabase dashboard (see .claude/CLAUDE.md, "Supabase").
SURVEILLED_SUPABASE_URL=
SURVEILLED_SUPABASE_SECRET_KEY=
SURVEILLED_STANDING_MIN_PLAYERS=10
EOF
  echo "    Created $env_file with a new salt."
else
  echo "    $env_file already exists; left as it is."
fi
chown deploy:deploy "$env_file"
chmod 600 "$env_file"

echo "==> Opening ports 80 and 443"
open_port() {
  local proto=$1 port=$2
  if iptables -C INPUT -p "$proto" --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    return
  fi
  # Oracle's images end the INPUT chain with a REJECT rule; the new rule must come before it.
  local reject_line
  reject_line=$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
  if [[ -n $reject_line ]]; then
    iptables -I INPUT "$reject_line" -p "$proto" --dport "$port" -m state --state NEW -j ACCEPT
  else
    iptables -A INPUT -p "$proto" --dport "$port" -m state --state NEW -j ACCEPT
  fi
}
open_port tcp 80
open_port tcp 443
open_port udp 443
netfilter-persistent save

echo
echo "Done. Next:"
echo "  1. Add the Supabase URL and secret key:  sudo -u deploy nano $env_file"
echo "  2. Back up the salt in $env_file somewhere safe."
echo "  3. Push to main (or run the CI/CD workflow) to deploy."
