# Télécharge l'original de la photo retenue pour le fond de l'Accueil
import urllib.request, os
UA = {'User-Agent': 'AG2027-site/1.0 (github.com/Nicolas78124/AG2027)'}
u = 'https://upload.wikimedia.org/wikipedia/commons/1/1e/MAURITIUS_LAGOON_NEXT_TO_LE_MORNE_3_-_panoramio.jpg'
os.makedirs('candidats', exist_ok=True)
open('candidats/original.jpg', 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read())
print(os.path.getsize('candidats/original.jpg'))
