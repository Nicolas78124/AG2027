# AG 2027 · Île Maurice

Site mobile du voyage golf AG 2027 (22–31 janvier 2027).

- `index.html` : le site (une seule page, sans build).
- `data/voyage.json`, `data/golf.json` : programme et classement golf, mis à jour par Claude.
- `data/change.json` : taux de secours si le taux en direct est indisponible.
- `data/secret.json` : contacts chiffrés avec le code d'accès.
- `supabase/setup.sql` : script de création des tables (dépenses, médias) et de l'espace photos.

Hébergement : Cloudflare Pages (branche `main`, sans commande de build). Données partagées : Supabase.
