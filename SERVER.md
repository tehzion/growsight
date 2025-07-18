### Configure System Timezone

```bash
# Set timezone
sudo timedatectl set-timezone Asia/Singapore

# Install timesyncd package (required on Debian 12)
sudo apt update
sudo apt install -y systemd-timesyncd

# Enable and start the timesyncd service
sudo systemctl enable systemd-timesyncd
sudo systemctl start systemd-timesyncd

# Verify timezone and synchronization status
timedatectl status
```

## Initial Security Setup

### 1. Create Secure Non-Root Admin User

```bash
# Generate random string for username
RANDOM_SUFFIX=$(openssl rand -hex 4)
ADMIN_USER="admin_${RANDOM_SUFFIX}"

# Create user with random name
sudo useradd -m -s /bin/bash "$ADMIN_USER"

# Generate strong password
ADMIN_PASS=$(openssl rand -base64 32)
echo "$ADMIN_USER:$ADMIN_PASS" | sudo chpasswd

# Add to sudo and www-data groups
sudo usermod -aG sudo,www-data "$ADMIN_USER"

# Setup SSH directory
sudo mkdir -p /home/$ADMIN_USER/.ssh
sudo chmod 700 /home/$ADMIN_USER/.ssh
sudo chown $ADMIN_USER:$ADMIN_USER /home/$ADMIN_USER/.ssh

# Display credentials (save immediately)
echo "===== SECURE CREDENTIALS ====="
echo "Username: $ADMIN_USER"
echo "Password: $ADMIN_PASS"
echo "=========================="

# Clear credentials from system
ADMIN_PASS=""
history -c
history -w
clear

# Reboot system
sudo reboot
```

### 2. Configure SSH Access

On the local machine:

```bash
# Login as $ADMIN_USER then add your public key
echo "your-copied-public-key" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 3. Harden SSH Configuration

```bash
# Set ADMIN_USER variable to current logged-in username
ADMIN_USER="$(whoami)"

# Generate high-range SSH port
SSH_PORT=$(shuf -i 49152-65535 -n 1)

echo $SSH_PORT > ~/.ssh/custom_port
chmod 600 ~/.ssh/custom_port

cat ~/.ssh/custom_port

# Change "PermitRootLogin yes" to "PermitRootLogin no" in SSH config to enhance security
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Remove all default conf
sudo rm /etc/ssh/sshd_config.d/*.conf

# Create secure config
sudo tee -a /etc/ssh/sshd_config.d/99-secure-ssh.conf << EOF
Port $SSH_PORT
Protocol 2
AddressFamily inet

# Authentication
LoginGraceTime 30
PermitRootLogin no
MaxAuthTries 3
MaxSessions 2

PubkeyAuthentication yes

PasswordAuthentication no
PermitEmptyPasswords no

AllowUsers $ADMIN_USER deploy

# Security
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
PermitUserEnvironment no
ClientAliveInterval 300
ClientAliveCountMax 2

# Modern Crypto Settings
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
EOF

sudo systemctl restart ssh
```

## System Hardening

### 1. Setup Firewall & Updates

```bash
# Install ufw if not already installed
sudo apt update
sudo apt install -y ufw

# Default policies for IPv4
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only required ports
sudo ufw limit ${SSH_PORT}/tcp comment 'SSH custom port'

# Delete existing SSH port rule if it exists
sudo ufw delete allow 22/tcp

sudo ufw enable

sudo ufw status

sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y

sudo reboot
```

```bash
# Setup Env
ADMIN_USER="$(whoami)"
SSH_PORT="$(cat ~/.ssh/custom_port)"
```

## Docker Setup

### 1. Install Docker

```bash
# Add required packages
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Setup Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository for Debian
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
ADMIN_USER="$(whoami)"
sudo usermod -aG docker $ADMIN_USER
```

### 2. Secure Docker Configuration

```bash
# Configure Docker daemon
sudo tee /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "no-new-privileges": true,
  "userland-proxy": false,
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "storage-driver": "overlay2",
  "icc": false,
  "ipv6": false
}
EOF

sudo systemctl restart docker

sudo reboot
```

## Project Deployment


### 1. Setup Project Directory

```bash
sudo apt update && sudo apt install -y nodejs npm

# Create directories manually
ADMIN_USER="$(whoami)"

sudo mkdir -p /opt/growsight
sudo chown -R www-data:www-data /opt/growsight
cd /opt/growsight

# Deploy Key
ssh-keygen -t ed25519 -C "kidd.tang@gmail.com"
cat ~/.ssh/id_ed25519.pub

# Put Public Key to github and test
ssh -T git@github.com

# Create deploy user without sudo access
sudo useradd -m -s /bin/bash deploy

# Add deploy user to www-data and docker groups for deployment access
sudo usermod -aG www-data deploy

# Setup SSH for deploy user
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chown deploy:deploy /home/deploy/.ssh

# Generate GitHub Deploy Key
sudo -u deploy ssh-keygen -t ed25519 -C "deploy@github-actions" -f /home/deploy/.ssh/id_ed25519 -N ""

# Set permissions for deploy user SSH keys
sudo chmod 600 /home/deploy/.ssh/id_ed25519
sudo chmod 644 /home/deploy/.ssh/id_ed25519.pub
sudo chown -R deploy:deploy /home/deploy/.ssh

# Add deploy key to authorized_keys for SSH login
sudo -u deploy cp /home/deploy/.ssh/id_ed25519.pub /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys

sudo cat /home/deploy/.ssh/id_ed25519.pub

# Configure git safe directory for deploy user
sudo -u deploy git config --global --add safe.directory /opt/growsight

# Test GitHub access as deploy user
sudo -u deploy ssh -T git@github.com

# Set ownership and permissions for deployment directory
sudo chown -R www-data:www-data /opt/growsight
sudo chmod -R g+rw /opt/growsight

# Clone repository and setup directories
# Forked: git clone git@github.com:kiddtang/growsight.git .
git clone git@github.com:tehzion/growsight.git .
git config --global --add safe.directory /opt/growsight
git checkout deploy
```

### 2. Configure Environment
```bash
cp .env.example .env

# Set ownership and permissions for deployment directory
sudo chown -R www-data:www-data /opt/growsight
sudo find /opt/growsight -type d -exec chmod 775 {} \;  # dirs: rwxrwxr-x
sudo find /opt/growsight -type f -exec chmod 664 {} \;  # files: rw-r--r--
sudo find /opt/growsight -type d -exec chmod g+s {} \;  # setgid on dirs
sudo chown root:www-data /opt/growsight/.env
sudo chmod 640 /opt/growsight/.env
```

### 3. Deploy Services

```bash
cd /opt/growsight/

docker compose pull

# Deployment Script
sudo chmod +x build-and-deploy.sh
RUN_MIGRATIONS=true ./build-and-deploy.sh

# Reset ownership and permissions for deployment directory
sudo chown -R www-data:www-data /opt/growsight
sudo find /opt/growsight -type d -exec chmod 775 {} \;  # dirs: rwxrwxr-x
sudo find /opt/growsight -type f -exec chmod 664 {} \;  # files: rw-r--r--
sudo find /opt/growsight -type d -exec chmod g+s {} \;  # setgid on dirs
sudo chown root:www-data /opt/growsight/.env
sudo chmod 640 /opt/growsight/.env

# Start containers
docker compose up -d

# Verify deployment
docker compose ps
```

## GitHub Actions Deployment Setup

### SSH Deploy Configuration

Secure deployment setup using dedicated deploy user (best practice).

#### Security Benefits:
- Deploy user has no sudo access
- Limited to /opt/growsight directory only
- Separate from admin user credentials
- GitHub deploy key shared between admin and deploy users
- SSH login keys remain separate and secure

#### GitHub Repository Secrets
Repository Settings → Secrets and variables → Actions → Repository secrets:

| Secret | Value |
|--------|-------|
| `HOST` | Your server IP address |
| `SSH_PORT` | Your custom SSH port (from ~/.ssh/custom_port) |
| `USERNAME` | `deploy` |
| `SSH_KEY` | Contents of `/home/deploy/.ssh/id_ed25519` (private key) |
| `DEPLOY_PATH` | `/opt/growsight` (or your custom deployment path) |

**Note:** Use Repository secrets (not Environment secrets) for simpler setup.

#### Test Deployment Connection
```bash
# Get your custom SSH port
SSH_PORT=$(cat ~/.ssh/custom_port)

# Test SSH connection as deploy user
ssh -i ~/.ssh/github_deploy_key -p $SSH_PORT deploy@your-server-ip
```
