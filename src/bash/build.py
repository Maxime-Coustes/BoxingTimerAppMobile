"""Legacy Bubblewrap helper kept for reference only.

This project now uses Capacitor for Android packaging.
Do not use this script for current APK builds.
"""

import time
import requests
import pexpect
import sys
import os
import subprocess
import threading

def kill_process_by_port(port):
    """Vérifie si le port est utilisé, et tue le processus si c'est le cas."""
    try:
        # Vérifier si le port est en écoute (lsof)
        result = subprocess.run(['lsof', '-i', f':{port}'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        if result.stdout:
            # Récupérer le PID du processus qui utilise ce port
            pid = result.stdout.decode('utf-8').splitlines()[1].split()[1]  # Récupère le PID de la 2e ligne
            print(f"🔴 Port {port} déjà utilisé, tuons le processus avec PID {pid}...")
            subprocess.run(['kill', '-9', pid])
            print(f"✅ Processus avec PID {pid} tué.")
        else:
            print(f"✅ Aucun processus utilisant le port {port}.")
    except Exception as e:
        print(f"❌ Erreur lors de la vérification du port {port}: {e}")

def kill_ngrok_process():
    """Vérifie si un processus ngrok est lancé et tue le processus si nécessaire."""
    try:
        result = subprocess.run(['ps', 'aux'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if b'ngrok' in result.stdout:
            print("🔴 ngrok déjà lancé, on tue le processus...")
            # Cherche le PID de ngrok dans le résultat de ps aux
            for line in result.stdout.decode('utf-8').splitlines():
                if 'ngrok' in line:
                    pid = line.split()[1]
                    subprocess.run(['kill', '-9', pid])
                    print(f"✅ Processus ngrok avec PID {pid} tué.")
                    break
        else:
            print("✅ Aucun processus ngrok trouvé.")
    except Exception as e:
        print(f"❌ Erreur lors de la vérification de ngrok: {e}")

# Vérification des processus existants avant de lancer de nouveaux processus
kill_process_by_port(3000)
kill_ngrok_process()


# Se placer dans le répertoire de travail du projet
os.chdir('/home/max/workspace/BoxingTimerApp')

def launch_serve():
    print("🚀 Lancement de npx serve pour diffuser l'application...")
    subprocess.Popen(
        ["npx", "serve", "dist/boxing-timer-app/browser/"]
    )

def launch_ngrok():
    print("🚀 Lancement de ngrok...")
    subprocess.Popen(
        ["ngrok", "http", "3000"]
    )

# Lancer serve et ngrok en parallèle
serve_thread = threading.Thread(target=launch_serve)
ngrok_thread = threading.Thread(target=launch_ngrok)

serve_thread.start()
ngrok_thread.start()

serve_thread.join()  # Attends que serve termine (facultatif)
ngrok_thread.join()  # Attends que ngrok termine (facultatif)

# Ajouter un délai pour être sûr que ngrok a bien démarré
time.sleep(5)  # Attendre 5 secondes pour être sûr que ngrok est prêt

# 3. Récupérer l'URL publique de ngrok
try:
    response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
    response.raise_for_status()
    data = response.json()
    NGROK_URL = data["tunnels"][0]["public_url"]
except (requests.RequestException, KeyError, IndexError) as e:
    print(f"❌ Erreur : Impossible de récupérer l'URL de ngrok ({e})")
    sys.exit(1)

print(f"✅ URL publique de ngrok récupérée : {NGROK_URL}")

# 4. Lancer bubblewrap init
command = "bubblewrap init --manifest=http://localhost:3000/manifest.webmanifest --verbose"
print(f"🚀 Exécution de la commande : {command}")
try:
    child = pexpect.spawn(command, timeout=10, encoding='utf-8')
except pexpect.ExceptionPexpect as e:
    print(f"❌ Erreur lors du lancement de bubblewrap : {e}")
    sys.exit(1)

# 5. Liste des entrées à envoyer
entries = {
    "Domain:": NGROK_URL,
    "URL path:": "/",
    "Application name:": "BoxingTimerApp",
    "Short name:": "MaxBoxeTool",
    "Application ID:": "localhost_3000.twa",
    "Starting version code for the new app version:": str(int(time.time())),  # Utilise le timestamp pour garantir un numéro de version unique
    "Display mode:": "standalone",
    "Orientation:": "default",
    "Status bar color:": "#1976D2",
    "Splash screen color:": "#FAFAFA",
    "Icon URL:": "http://localhost:3000/icons/icon-512x512.png",
    "Maskable icon URL:": "http://localhost:3000/icons/icon-512x512.png",
    "Monochrome icon URL:": "",
    "Include support for Play Billing": "n",
    "Request geolocation permission?": "n",
    "Key store location:": "/home/max/workspace/BoxingTimerApp/android.keystore",
    "Key name:": "android"
}

# 6. Attente et envoi des réponses
for prompt, response in entries.items():
    try:
        print(f"⏳ Attente du prompt : {prompt}")
        child.expect(prompt, timeout=10)
        print(f"✍️ Envoi de : {response}")
        child.sendline(response)
    except pexpect.TIMEOUT:
        print(f"⚠️ Timeout en attendant : {prompt}")
        sys.exit(1)
    except pexpect.EOF:
        print(f"⚠️ Bubblewrap s'est terminé de manière inattendue.")
        sys.exit(1)

# 7. Attendre la fin du processus de bubblewrap
child.expect(pexpect.EOF)
os.system('clear')
print("✅ Bubblewrap initialisé avec succès !")

# 8. Ajouter la commande de build
BUILD_PWD = "MaxMDP"

# Lancer la commande bubblewrap build dans le même répertoire
command = "bubblewrap build"
child = pexpect.spawn(command, timeout=60, encoding='utf-8')

# Gestion des mots de passe
child.expect("Password for the Key Store:", timeout=10)
child.sendline(BUILD_PWD)
child.expect("Password for the Key:", timeout=10)
child.sendline(BUILD_PWD)

# Attendre la fin du processus de build
child.expect(pexpect.EOF)
print("✅ Build de l'apk terminé avec succès !")

# 9. Capturer la sortie du build en temps réel
output = child.before

# Imprimer la sortie du build
print(f"✅ Build de l'apk terminé avec succès !")
