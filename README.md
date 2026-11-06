# Souffleur

**Copilote d'entretien open source.** Souffleur transcrit l'entretien en direct, repère les questions du recruteur et
suggère en quelques secondes une réponse construite à partir de *votre* CV et de l'offre visée. Il génère aussi des CV
optimisés ATS, des lettres de motivation, et suit vos candidatures.

- 🔒 **Local-first** : profil, transcriptions, réponses et documents sont stockés dans votre navigateur (IndexedDB).
  L'audio n'est jamais enregistré.
- 🔑 **Vos clés, vos coûts** : pas d'abonnement ni de crédits. Vous fournissez une clé Claude (et Deepgram en option).
- 🧩 **Simple à héberger** : une seule app Next.js, aucune base de données.

## Fonctionnalités

| | |
| --- | --- |
| **Profil depuis le CV** | PDF (même scanné), DOCX ou texte → profil structuré (expériences, résultats, compétences), éditable. |
| **Session live** | Transcription séparée *recruteur* (audio de l'onglet visio) / *moi* (micro). Détection de fin de question, réponse suggérée en streaming. |
| **Réponses ancrées** | Uniquement à partir des faits du profil ; les manques sont signalés `[à compléter]`. Longueur et ton réglables. |
| **Tests techniques** | « Analyser l'écran » : capture de l'onglet partagé (ou image importée) → énoncé, approche, complexité, code commenté. |
| **Multilingue** | FR, EN, ES, DE, IT, PT, NL, ZH (transcription + réponses). |
| **CV ATS & lettres** | Collez une offre → CV reformulé et lettre personnalisée, éditables, export Markdown / PDF. |
| **Candidatures** | Kanban (à postuler → offre), lien direct vers la préparation d'entretien. |
| **Historique** | Sessions archivées, relecture, export Markdown, suppression. Sauvegarde / import JSON de toutes les données. |

Raccourcis en session : `Espace` répondre à la dernière question · `S` analyser l'écran · `Échap` arrêter ·
`⌘/Ctrl + Entrée` envoyer une question tapée.

## Démarrage

Prérequis : Node.js 20+, Chrome ou Edge (partage d'onglet avec audio).

```bash
git clone https://github.com/Senorsean/souffleur.git
cd souffleur
npm install
cp .env.example .env.local
# renseignez ANTHROPIC_API_KEY (obligatoire) et DEEPGRAM_API_KEY (optionnel)
npm run dev
```

Ouvrez http://localhost:3000, importez votre CV dans **Profil & CV**, puis créez un **Nouvel entretien**.

### Transcription

| Moteur | Sources | Clé | Notes |
| --- | --- | --- | --- |
| **Deepgram** (nova-3) | onglet visio + micro, séparés | `DEEPGRAM_API_KEY` (rôle **Member** minimum) | Faible latence. Le navigateur reçoit un jeton de 60 s, jamais la clé. |
| **Navigateur** (Web Speech) | micro uniquement | aucune | Gratuit. Chrome / Edge. Pratique sur haut-parleur ou pour tester. |

Pour capter le recruteur, ouvrez la visio (Google Meet, Teams web, Zoom web…) **dans un onglet** Chrome/Edge, cliquez
« Démarrer l'écoute », choisissez cet onglet et cochez **« Partager l'audio de l'onglet »**. Avec une application de
bureau (Zoom, Teams…), utilisez le mode « Micro seulement ».

### Modèles

Par défaut `claude-opus-5-5` (effort `low` pour les réponses live, `medium` pour les documents). Changez-le dans
**Réglages** : `claude-sonnet-5-5` ou `claude-haiku-5-5` pour plus de vitesse et un coût moindre. Les requêtes Opus/Sonnet
activent le repli serveur (`fallbacks: "default"`) en cas de refus du modèle.

## Déploiement

L'app fonctionne partout où Next.js tourne (Vercel, Netlify, Docker, VPS). **Avant de l'exposer sur Internet**, définissez
`SOUFFLEUR_PASSWORD` (authentification HTTP Basic sur toutes les pages et routes API), sinon n'importe qui pourrait
consommer vos crédits API.

```bash
npm run build && npm start
```

### Vercel

```bash
vercel link --project souffleur
vercel env add ANTHROPIC_API_KEY production --sensitive
vercel env add DEEPGRAM_API_KEY production --sensitive    # rôle Member minimum
vercel env add SOUFFLEUR_USER production --sensitive
vercel env add SOUFFLEUR_PASSWORD production --sensitive
vercel deploy --prod
```

`vercel.json` force le préréglage Next.js. Les envois de fichiers sont limités à 4 Mo (limite des fonctions Vercel).

Une fois le projet relié au dépôt (`vercel git connect`), chaque push sur `main` redéploie la production et chaque autre branche obtient une URL de prévisualisation.

## Architecture

```
src/
  app/
    page.tsx                 landing
    app/                     application (client, IndexedDB)
      profile/ sessions/ documents/ applications/ settings/
    api/
      answer/                réponse live (stream texte)
      screen/                analyse de capture d'écran (vision)
      documents/             CV ATS / lettre (stream markdown)
      profile/parse/         CV → profil JSON (sorties structurées)
      stt/token/             jeton Deepgram temporaire
      status/                clés configurées ?
  lib/                       db (Dexie), stt (Deepgram + Web Speech), capture, réglages, types
  server/                    client Claude, prompts, schémas zod
  proxy.ts                   mot de passe optionnel
replica/                     notes de conception (recon, matrice de fonctionnalités, architecture)
```

## Usage responsable

Souffleur est un copilote : il aide à structurer ce que **vous** avez réellement fait, il ne remplace pas vos compétences.

- Selon votre pays, transcrire une conversation peut exiger l'accord des participants : informez-les.
- Le projet n'inclut volontairement aucun « mode furtif » destiné à masquer l'outil à vos interlocuteurs.
- Relisez chaque suggestion et reformulez-la avec vos mots.

## Origine

Projet indépendant, écrit de zéro. Il reprend des *fonctionnalités* courantes des assistants d'entretien (transcription,
suggestions, CV ATS) mais aucun code, texte, logo ni visuel d'un produit existant. Voir `replica/recon.md`.

## Licence

MIT
