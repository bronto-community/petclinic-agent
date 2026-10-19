#!/usr/bin/env bash
# Deploys PetClinic (petclinic/compose.yaml) to one AWS Lightsail instance.
#
#   BRONTO_API_KEY=... ./infra/deploy-lightsail.sh
#
# Creates a 2 GB instance (small_3_0, $12/month) and a static IP (free while
# attached), opens ports 80 and 443, and boots the compose stack with Caddy
# serving https://petclinic-<ip>.sslip.io. Prints the URL and the shared key
# for the agent's PETCLINIC_URL and PETCLINIC_API_KEY.
set -euo pipefail

REGION="${AWS_REGION:-eu-west-1}"
NAME="${NAME:-petclinic}"
BUNDLE="${BUNDLE:-small_3_0}"
REPO="${REPO:-https://github.com/bronto-community/petclinic-agent.git}"
BRONTO_REGION="${BRONTO_REGION:-eu}"
: "${BRONTO_API_KEY:?set BRONTO_API_KEY (a Bronto API key with the Ingestion role)}"
PETCLINIC_API_KEY="${PETCLINIC_API_KEY:-$(openssl rand -hex 24)}"
ls() { aws lightsail --region "$REGION" "$@"; }

ls allocate-static-ip --static-ip-name "$NAME-ip" >/dev/null
IP=$(ls get-static-ip --static-ip-name "$NAME-ip" --query staticIp.ipAddress --output text)
HOST="petclinic-${IP//./-}.sslip.io"

USER_DATA=$(cat <<SCRIPT
#!/bin/bash
set -eux
apt-get update
apt-get install -y docker.io docker-compose-v2 git
git clone --depth 1 $REPO /opt/petclinic-agent
cd /opt/petclinic-agent/petclinic
cat > .env <<ENV
PETCLINIC_API_KEY=$PETCLINIC_API_KEY
BRONTO_REGION=$BRONTO_REGION
BRONTO_API_KEY=$BRONTO_API_KEY
SITE_ADDRESS=$HOST
ENVIRONMENT=production
ENV
chmod 600 .env
docker compose -f compose.yaml -f compose.aws.yaml up -d --build
SCRIPT
)

ls create-instances --instance-names "$NAME" --availability-zone "${REGION}a" \
  --blueprint-id ubuntu_24_04 --bundle-id "$BUNDLE" --user-data "$USER_DATA" >/dev/null
until [ "$(ls get-instance-state --instance-name "$NAME" --query state.name --output text)" = running ]; do sleep 5; done
ls attach-static-ip --static-ip-name "$NAME-ip" --instance-name "$NAME" >/dev/null
ls put-instance-public-ports --instance-name "$NAME" --port-infos \
  fromPort=22,toPort=22,protocol=tcp fromPort=80,toPort=80,protocol=tcp fromPort=443,toPort=443,protocol=tcp >/dev/null

echo "PETCLINIC_URL=https://$HOST/petclinic/api"
echo "PETCLINIC_API_KEY=$PETCLINIC_API_KEY"
echo "First boot takes a few minutes (Docker install, image build, certificate)."
