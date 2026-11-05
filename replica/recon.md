# Recon map: MyInterviewClean (web + desktop Windows/macOS)

Scope: core loop (CV → profil → session d'entretien live avec transcription + réponses IA), mode code (capture écran),
génération CV ATS + lettre de motivation, archive des sessions, suivi de candidatures.
For: alternative open source, auto-hébergée, mono-utilisateur, clés API fournies par l'utilisateur (BYOK).
Clone name: **Souffleur** (aucun nom, logo, texte ou asset de l'original repris).
Date: 2026-11-05

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://myinterviewclean.com/fr | hero, 3 étapes « La méthode », features, compat visio |
| 2 | pricing page | https://myinterviewclean.com/fr/pricing | 3 plans, modèle crédits (1 crédit = 1 h), essai 10 min |
| 3 | FAQ | https://myinterviewclean.com/fr/faq | audio non stocké, multi-langue, n'importe quelle source audio |
| 4 | desktop download | https://myinterviewclean.com/fr/download-desktop | .exe/.dmg, permissions micro, fenêtre always-on-top |
| 5 | terms | https://myinterviewclean.com/fr/terms | §4 usages interdits, §9 PI (code/algos/design) |
| 6 | privacy | https://myinterviewclean.com/fr/privacy | données stockées, sous-traitants (STT, LLM, Stripe, BDD UE) |
| — | help center / changelog / app stores / vidéos | none found | — |
| — | user's own account | not used | pas de compte ; recon 100 % sources publiques |

ToS check: pas de clause « interdit de construire un concurrent ». §9 interdit la copie du code, des algorithmes, du
design et des contenus → clean-room : on ne reprend que les fonctionnalités et les patterns UX. Aucun JS lu, aucune API
privée observée.

## Core loop

L'utilisateur importe son CV, lance une session pendant un entretien visio, et reçoit en < 1-2 s une réponse
suggérée à chaque question du recruteur, basée sur son profil et l'offre.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Landing | `/` | pitch, 3 étapes, CTA | hero, feature cards, steps, CTA | filled |
| S02 | Dashboard | `/app` | point d'entrée : profil, dernières sessions, raccourcis | stat cards, list, CTA « Nouvelle session » | empty (pas de CV), filled |
| S03 | Profil / base de connaissances | `/app/profile` | import CV → profil structuré éditable | dropzone, parsing progress, form sections (expériences, compétences, réalisations) | empty, loading (parsing), filled, error (fichier illisible) |
| S04 | Préparation session | `/app/sessions/new` | contexte : entreprise, poste, offre, langue, source audio | form, select langue, audio source picker | empty, filled, permission denied (micro) |
| S05 | Session live | `/app/sessions/[id]` | transcription live + réponses IA | transcript feed (Recruteur / Moi), answer panel streaming, bouton Répondre, capture écran code, timer | connecting, listening, generating, error (STT/LLM), ended |
| S06 | Détail session | `/app/sessions/[id]` (status ended) | relire transcript + réponses, exporter, supprimer | transcript, Q/R list, export | filled, empty (session vide) |
| S07 | Archive sessions | `/app/sessions` | liste des sessions passées | table/list, search, delete | empty, filled |
| S08 | Documents (CV ATS + lettre) | `/app/documents` | coller une offre → générer CV + lettre, éditer, exporter | textarea offre, tabs CV/Lettre, editor, export/print | empty, generating, filled, error |
| S09 | Candidatures | `/app/applications` | suivi des candidatures | kanban colonnes statut, card, modal édition | empty, filled |
| S10 | Réglages | `/app/settings` | clés/fournisseurs, langue, style de réponse | form, status badges clés | filled, error (clé invalide) |
| S11 | Pricing / crédits | `/pricing` (original) | — | — | skip (open source, pas de facturation) |
| S12 | Sign-in / sign-up | `/sign-in` (original) | — | — | skip v1 (mono-utilisateur local) |

## Flows

```
F01 Créer son profil depuis un CV
    S02 -> S03 (drop PDF/DOCX) -> parsing IA -> profil structuré -> sauvegarde
    happy path clicks: 2 (ouvrir Profil, déposer fichier) + 1 (enregistrer)
    edge: PDF scanné sans texte, DOCX corrompu, CV > 10 pages, pas de clé API, édition manuelle sans CV

F02 Être assisté pendant un entretien (CORE)
    S02 -> S04 (entreprise, poste, offre, langue, source) -> S05 (autoriser micro / partager onglet visio)
        -> question recruteur transcrite -> réponse suggérée en streaming -> ... -> Terminer -> S06
    happy path clicks: 4 (Nouvelle session, Démarrer, choisir onglet, Partager)
    edge: permission micro refusée, onglet partagé sans audio, STT coupé (reconnexion), question très courte,
          deux questions enchaînées, pas de profil, langue changée en cours, LLM en erreur / rate limit

F03 Aide sur test technique (code à l'écran)
    S05 -> « Analyser l'écran » -> capture d'une image de l'écran partagé -> explication + solution pas à pas
    happy path clicks: 1 (si écran déjà partagé) ou 3
    edge: aucun écran partagé, image illisible, code très long

F04 Générer CV ATS + lettre pour une offre
    S02 -> S08 -> coller offre -> Générer -> éditer -> exporter (impression PDF / copie)
    happy path clicks: 3
    edge: pas de profil, offre vide/trop longue, génération interrompue

F05 Relire / exporter / supprimer une session
    S07 -> S06 -> Exporter (Markdown) | Supprimer
    happy path clicks: 2

F06 Suivre ses candidatures
    S09 -> « Ajouter » -> entreprise/poste/lien/statut -> déplacer entre colonnes -> lier une session
    happy path clicks: 3
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger | default, hover, focus, disabled, loading | all |
| Input / Textarea | text, url, multiline | default, focus, error, disabled | S03, S04, S08, S09, S10 |
| Select | language, model, audio source | default, open, disabled | S04, S10 |
| Dropzone | file | idle, drag-over, uploading, error | S03 |
| Card | stat, feature, application | default, hover | S01, S02, S09 |
| Sidebar nav | — | active, hover | S02–S10 |
| Transcript bubble | recruteur, moi, interim | interim (grisé), final | S05, S06 |
| Answer panel | streaming, done, error | — | S05, S06 |
| Status pill | listening, connecting, error, ended | — | S05, S07 |
| Tabs | CV / Lettre | active | S08 |
| Kanban column | per status | drag-over | S09 |
| Modal | edit application, confirm delete | open/closed | S07, S09 |
| Toast | success, error | — | all |
| Empty state | per screen | — | S02, S03, S07, S08, S09 |

## Inferred data model

```
Profile     id, full_name, headline, summary, raw_cv_text, experiences[] (company, role, start, end, bullets[]),
            skills[], achievements[], education[], languages[], updated_at
            evidence: home « Importez votre profil », FAQ, privacy (CV stocké comme profil)   confidence: high (fields = guess)

Session     id, title, company, role, job_description, language, audio_source (mic | tab | mic+tab),
            status (live | ended), started_at, ended_at, application_id?
            evidence: privacy (transcripts, questions, réponses), ToS « archives de sessions »   confidence: high

Utterance   id, session_id, speaker (interviewer | me), text, at
            evidence: transcription temps réel ; séparation locuteurs = guess                     confidence: medium

Answer      id, session_id, question_text, answer_text, kind (answer | code), model, at
            evidence: pricing « sauvegarde transcript + réponses IA »                           confidence: high

Document    id, kind (cv | cover_letter), job_title, company, job_description, content_md, created_at
            evidence: home CV ATS + lettre, ToS « éditeur de CV et lettres »                       confidence: high

Application id, company, role, url, status (to_apply | applied | interview | offer | rejected), notes, updated_at
            evidence: ToS « gestionnaire de candidatures » (aucun détail → champs = guess)       confidence: guess

Credits     balance, period_end — original only (facturation)                                   confidence: high → skip
```

Relationships: Profile 1 (mono-utilisateur) ; Session 1-n Utterance ; Session 1-n Answer ; Application 0-n Session ;
Document n-1 Profile.

## Feature matrix

See `features.csv`. Must: 17, should: 8, could: 5, skip: 6.

## Out of scope (cannot or should not be cloned)

- **« Mode fantôme » / invisibilité au partage d'écran et « indétectable par le recruteur »** : sert uniquement à tromper
  la partie adverse ; les propres CGU de l'original (§4) interdisent la tromperie frauduleuse d'un recruteur. Non construit.
  Le clone est un copilote affiché normalement (2e écran, autre onglet, ou entraînement).
- Crédits, abonnements, Stripe : open source auto-hébergé, chaque utilisateur paie ses propres clés API.
- Comptes multi-utilisateurs / auth (v1 mono-utilisateur local ; données dans le navigateur).
- Logos clients, témoignages, chiffre « 4000+ candidats », textes marketing : appartiennent à l'original.
- App desktop native (v1 web ; Tauri/Electron possible plus tard).

## Size

Screens 10 (2 skip), flows 6, entities 6. Hard parts: transcription temps réel bi-source (micro + audio d'onglet) avec
détection de fin de question ; latence réponse (streaming, modèle rapide) ; parsing CV PDF/DOCX fiable. Size: M.
