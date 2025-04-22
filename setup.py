import os
import subprocess
from pathlib import Path
import shutil
import sys

# Directories to run `npm install`
NPM_DIRS = [
    "./demo/bank-app/frontend",
    "./demo/bank-app/backend",
    "./demo/dmv-app/frontend",
    "./demo/dmv-app/backend",
]

# Directory to run `yarn install`
YARN_DIR = "./snap"

# Directories that need backend .env with private key
ENV_DIRS_BACKEND = [
    "./demo/bank-app/backend",
    "./demo/dmv-app/backend"
]

# Directory that needs snap .env with companion origin
ENV_DIR_SNAP = "./snap/packages/snap"

def check_command_exists(command):
    return shutil.which(command) is not None

def run_install(command, path):
    try:
        print(f"🔧 Running `{command} install` in {path}...")
        subprocess.run([command, "install"], cwd=path, check=True)
    except subprocess.CalledProcessError:
        print(f"❌ Error: `{command} install` failed in {path}.")
        sys.exit(1)

def write_env_file_backend(path, wallet_key, infura_id):
    env_path = Path(path) / ".env"
    env_contents = f'WALLET_PRIVATE_KEY="{wallet_key}"\nINFURA_PROJECT_ID="{infura_id}"\n'
    env_path.write_text(env_contents)
    print(f"✅ Wrote .env file to {path}")

def write_env_file_snap(path, infura_id):
    env_path = Path(path) / ".env"
    env_contents = f'INFURA_PROJECT_ID="{infura_id}"\nCOMPANION_APP_ORIGIN="http://localhost:8000"\n'
    env_path.write_text(env_contents)
    print(f"✅ Wrote .env file to {path}")

def main():
    print("🚀 Project setup starting...\n")

    if not check_command_exists("npm"):
        print("❌ Error: `npm` is not installed or not in PATH.")
        sys.exit(1)

    if not check_command_exists("yarn"):
        print("❌ Error: `yarn` is not installed or not in PATH.")
        sys.exit(1)

    wallet_key = input("🔑 Enter your Ethereum wallet private key: ").strip()
    infura_id = input("🔌 Enter your Infura testnet project ID: ").strip()

    for directory in NPM_DIRS:
        run_install("npm", directory)

    run_install("yarn", YARN_DIR)

    for directory in ENV_DIRS_BACKEND:
        write_env_file_backend(directory, wallet_key, infura_id)

    write_env_file_snap(ENV_DIR_SNAP, infura_id)

    print("\n✅ Setup complete! You're ready to go.")

if __name__ == "__main__":
    main()
