# Architecture : Souffleur

## Stack (boring, self-hostable)

| couche | choix | pourquoi |
| --- | --- | --- |
| App | Next.js 16 (App Router) + React 19 + TypeScript | un seul process, routes API côté serveur pour garder les clés secrètes |
| UI | Tailwind CSS 4 + lucide-react + react-markdown | pas de kit UI propriétaire |
| Données | IndexedDB via Dexie (navigateur) | local-first, zéro BDD à installer, données jamais sur un serveur tiers |
| LLM | Claude via `@anthropic-ai/sdk` (serveur) | streaming, PDF natif, vision, sorties structurées |
| STT | Deepgram streaming (nova-3) via token temporaire, sinon Web Speech API du navigateur | latence < 300 ms, 2 flux séparés (recruteur / moi) |
| Capture | `getUserMedia` (micro) + `getDisplayMedia` (onglet visio : audio + image pour le mode code) | web, aucune install |

Clés : `.env.local` → `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` (optionnel). Jamais exposées au navigateur
(Deepgram : JWT 30 s via `/v1/auth/grant`).

## Schéma (Dexie)

```
profile      id='me', fullName, headline, location, summary, experiences[], skills[], achievements[],
             education[], languages[], rawText, updatedAt
sessions     ++id, title, company, role, jobDescription, notes, language, sttProvider, status, startedAt,
             endedAt, applicationId?
utterances   ++id, sessionId, speaker ('interviewer'|'me'), text, at          index: sessionId
answers      ++id, sessionId, question, answer, kind ('answer'|'code'), at   index: sessionId
documents    ++id, kind ('cv'|'letter'), title, company, jobDescription, content, createdAt
applications ++id, company, role, url, status, notes, updatedAt              index: status
settings     localStorage 'souffleur.settings'
```

## Routes

| route | méthode | flow | rôle |
| --- | --- | --- | --- |
| `/api/status` | GET | — | clés configurées ? |
| `/api/profile/parse` | POST multipart | F01 | PDF (bloc document) / DOCX (mammoth) / TXT → profil JSON (zod) |
| `/api/answer` | POST | F02 | stream texte : réponse suggérée (profil + offre + transcript) |
| `/api/screen` | POST | F03 | stream texte : analyse d'une capture d'écran (code) |
| `/api/documents` | POST | F04 | stream markdown : CV ATS ou lettre |
| `/api/stt/token` | POST | F02 | JWT Deepgram 30 s |

## Ordre de build (vertical slice d'abord)

1. Shell (sidebar, layout) + settings + status clés
2. **Slice** : profil (import CV) → nouvelle session → live (Deepgram/Web Speech) → réponse streamée → archive
3. Détail session + export
4. Mode code (capture écran)
5. Documents (CV ATS + lettre)
6. Candidatures (kanban)
7. Landing
