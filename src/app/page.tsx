import {
  ArrowRight,
  Code2,
  FileText,
  GitFork,
  Globe2,
  KanbanSquare,
  Lock,
  Mic,
  ServerCog,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    icon: Mic,
    title: "Transcription en direct",
    text: "La voix du recruteur (onglet visio) et la vôtre (micro) sont transcrites séparément, en temps réel.",
  },
  {
    icon: Sparkles,
    title: "Réponses ancrées dans votre CV",
    text: "Chaque suggestion s'appuie sur vos vraies expériences et l'offre visée. Rien n'est inventé : les trous sont signalés.",
  },
  {
    icon: Code2,
    title: "Tests techniques",
    text: "Capturez l'écran : énoncé reformulé, approche, complexité, solution commentée et points à expliquer.",
  },
  {
    icon: Globe2,
    title: "Multilingue",
    text: "Français, anglais, espagnol, allemand, italien, portugais, néerlandais, mandarin.",
  },
  {
    icon: FileText,
    title: "CV ATS et lettres",
    text: "Collez une offre : CV reformulé avec les bons mots-clés et lettre personnalisée, exportables en PDF.",
  },
  {
    icon: KanbanSquare,
    title: "Suivi des candidatures",
    text: "Un tableau simple, de « à postuler » à « offre », avec un raccourci pour préparer chaque entretien.",
  },
];

export default function Landing() {
  return (
    <div className="bg-paper">
      {/* Stage */}
      <section className="relative overflow-hidden bg-ink-950 text-paper">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #ef9b33, transparent)" }}
        />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo dark />
          <div className="flex items-center gap-2 text-sm">
            <a
              href="https://github.com/Senorsean/souffleur"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-stone-300 hover:text-paper sm:inline-flex"
            >
              <GitFork className="size-4" /> Code source
            </a>
            <Link href="/app" className="rounded-lg bg-paper px-4 py-2 font-medium text-ink-900 hover:bg-spot-100">
              Ouvrir l&apos;app
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-14 text-center sm:pt-20">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-paper/5 px-3 py-1 text-xs text-spot-200 ring-1 ring-paper/10">
            <span className="size-1.5 rounded-full bg-spot-400" /> Open source · MIT · auto-hébergé
          </p>
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Votre copilote open source
            <br />
            <span className="text-spot-300">pour chaque entretien.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-300">
            Souffleur écoute l&apos;entretien, repère les questions et vous propose en quelques secondes une réponse construite à
            partir de votre parcours. Vos données restent dans votre navigateur.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-spot-400 px-6 font-medium text-ink-950 hover:bg-spot-300"
            >
              Commencer <ArrowRight className="size-4" />
            </Link>
            <a
              href="#installation"
              className="inline-flex h-12 items-center gap-2 rounded-lg px-6 font-medium text-paper ring-1 ring-paper/20 hover:bg-paper/5"
            >
              L&apos;installer chez moi
            </a>
          </div>

          {/* Product preview (static mock-up) */}
          <div className="mx-auto mt-16 max-w-5xl rounded-2xl bg-ink-900 p-3 text-left shadow-2xl ring-1 ring-paper/10">
            <div className="flex items-center gap-2 border-b border-ink-800 px-3 pb-3 text-xs text-stone-400">
              <span className="live-dot size-2 rounded-full bg-emerald-400" />
              Recruteur : écoute · Moi : écoute
              <span className="ml-auto font-mono">12:48</span>
            </div>
            <div className="grid gap-3 p-3 md:grid-cols-[5fr_7fr]">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-stone-500">Recruteur</p>
                  <p className="rounded-2xl rounded-bl-md bg-spot-400/10 px-3.5 py-2 text-spot-50 ring-1 ring-spot-400/30">
                    Parlez-moi d&apos;un projet où vous avez dû arbitrer entre délai et qualité.
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-stone-500">Moi</p>
                  <p className="rounded-2xl rounded-br-md bg-ink-700 px-3.5 py-2 text-stone-100">Oui, bien sûr…</p>
                </div>
              </div>
              <div className="rounded-xl bg-ink-950/60 p-4 ring-1 ring-spot-400/20">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-spot-300">Réponse suggérée</p>
                <p className="font-semibold text-spot-200">
                  Sur la refonte du paiement, j&apos;ai livré en deux temps pour tenir la date sans sacrifier la fiabilité.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-300">
                  <li>Contexte : lancement commercial fixé, 3 semaines de retard estimé.</li>
                  <li>Choix : périmètre réduit au parcours carte, tests de charge conservés.</li>
                  <li>Résultat : lancement à l&apos;heure, [à compléter : taux d&apos;erreur].</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Trois étapes</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { icon: UserRound, title: "Importez votre CV", text: "PDF ou Word. Un profil structuré est extrait en quelques secondes, modifiable à la main." },
            { icon: Mic, title: "Lancez la session", text: "Collez l'offre, partagez l'onglet de la visio. La transcription démarre." },
            { icon: Sparkles, title: "Laissez-vous souffler", text: "À chaque question, une réponse claire, à reformuler avec vos mots." },
          ].map((s, i) => (
            <div key={s.title} className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-semibold text-spot-400">{i + 1}</span>
                <s.icon className="size-5 text-ink-700" />
              </div>
              <h3 className="mt-4 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Tout ce qu&apos;il faut, rien de caché</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <div className="grid size-10 place-items-center rounded-xl bg-spot-50 text-spot-600">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-host */}
      <section id="installation" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Chez vous, à vos conditions</h2>
            <ul className="mt-6 space-y-4 text-sm text-stone-700">
              <li className="flex gap-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-spot-600" />
                Profil, transcriptions et documents restent dans votre navigateur (IndexedDB). L&apos;audio n&apos;est jamais
                enregistré.
              </li>
              <li className="flex gap-3">
                <ServerCog className="mt-0.5 size-4 shrink-0 text-spot-600" />
                Vous fournissez vos propres clés (Claude, et Deepgram en option). Pas d&apos;abonnement, pas de crédits.
              </li>
              <li className="flex gap-3">
                <GitFork className="mt-0.5 size-4 shrink-0 text-spot-600" />
                Licence MIT : lisez, modifiez, hébergez.
              </li>
            </ul>
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-ink-900 p-6 text-sm leading-relaxed text-stone-200">
            <code>{`git clone https://github.com/Senorsean/souffleur.git
cd souffleur
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY=…
npm run dev                  # http://localhost:3000`}</code>
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl bg-spot-50 p-6 text-sm text-ink-800 ring-1 ring-spot-200">
          <p className="font-medium">Usage responsable</p>
          <p className="mt-1 text-stone-700">
            Souffleur est un copilote : il prépare et soutient, il ne remplace pas vos compétences. Selon votre pays, transcrire
            une conversation peut exiger l&apos;accord des participants : informez-les. Restez honnête sur votre parcours, les
            suggestions ne s&apos;appuient que sur ce que vous avez réellement fait.
          </p>
        </div>
      </section>

      <footer className="border-t border-stone-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-stone-500">
          <Logo />
          <p>Projet open source indépendant · MIT</p>
        </div>
      </footer>
    </div>
  );
}
