import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  FolderTree,
  Layers,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameTile } from '../components/games/GameTile';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/layout/PageShell';
import { CURATED_SECTIONS } from '../data/curated';
import { useAuth } from '../hooks/useAuth';
import { fetchFeatured } from '../lib/steam';
import type { FeaturedLists } from '../lib/types';
import { STATUS_ORDER } from '../lib/types';

const FEATURES = [
  {
    icon: Search,
    title: 'Поиск по Steam',
    text: 'Тысячи игр в один клик: обложки, жанры, разработчики, Metacritic и цена подтягиваются автоматически.',
    accent: '#8b5cf6',
  },
  {
    icon: Layers,
    title: 'Статусы и оценки',
    text: 'Играю, пройдено, в планах, брошено — с оценкой, часами, заметками и датой финала.',
    accent: '#22d3ee',
  },
  {
    icon: FolderTree,
    title: 'Свои категории',
    text: 'Создавай категории с цветами: «Купить», «Инди», «На питче» — и раскладывай игры по ним.',
    accent: '#a3e635',
  },
  {
    icon: Trophy,
    title: 'Tier-листы',
    text: 'Drag & drop редактор: раскидывай игры по тирам S–C и делись результатом по ссылке.',
    accent: '#f472b6',
  },
  {
    icon: BarChart3,
    title: 'Статистика',
    text: 'Сколько пройдено, в среднем часов на игру, любимые жанры и топ категорий.',
    accent: '#fbbf24',
  },
  {
    icon: Users,
    title: 'Публичные профили',
    text: 'Своя страница с коллекцией и тир-листами — как витрина вкуса.',
    accent: '#fb7185',
  },
];

const STEPS = [
  { title: 'Найди игру', text: 'Поиск по каталогу Steam по названию.' },
  { title: 'Отметь статус', text: 'Играешь, прошёл, бросил — в один клик.' },
  { title: 'Собери тир-лист', text: 'Перетаскивай обложки в тиры и публикуй.' },
];

export function Landing() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<FeaturedLists | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    void fetchFeatured()
      .then(setFeatured)
      .catch(() => setFeatured(null));
  }, []);

  const trending = useMemo(() => featured?.topSellers.slice(0, 10) ?? [], [featured]);
  const sale = useMemo(() => featured?.specials.slice(0, 10) ?? [], [featured]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-300 backdrop-blur">
              <Sparkles className="size-3.5 text-cyan-300" />
              Данные Steam · бесплатно · без привязки к аккаунту Steam
            </div>

            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
              <span className="text-gradient">Твоя игровая библиотека</span>
              <br />
              <span className="text-slate-200">под полным контролем</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 text-pretty sm:text-lg">
              Отмечай пройденные игры, создавай собственные категории и собирай tier-листы
              drag &amp; drop. Всё хранится в твоём аккаунте и доступно по публичной ссылке.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to={user ? '/dashboard' : '/register'}>
                <Button size="lg" icon={<ArrowRight className="size-4" />}>
                  {user ? 'Открыть дашборд' : 'Создать аккаунт'}
                </Button>
              </Link>
              <Link to="/discover">
                <Button size="lg" variant="secondary">
                  Смотреть подборки
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <Stat label="120+ curated игр" />
              <Stat label={`${STATUS_ORDER.length} статуса и категории`} />
              <Stat label="Публичные тир-листы" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 sm:mt-20"
          >
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/6 bg-white/[0.015]">
        <PageShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Возможности"
            title="Всё, что нужно для библиотеки"
            description="Никаких лишних сущностей — только то, что реально помогает вести учёт."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="surface group relative overflow-hidden rounded-2xl p-5 transition hover:border-white/15"
              >
                <div
                  className="absolute -top-12 -right-10 size-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                  style={{ background: feature.accent }}
                />
                <div className="relative">
                  <div
                    className="mb-4 flex size-10 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: `${feature.accent}44`,
                      background: `${feature.accent}14`,
                      color: feature.accent,
                    }}
                  >
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </PageShell>
      </section>

      <section>
        <PageShell className="py-16 sm:py-20">
          <SectionHeading eyebrow="Как это работает" title="Три шага до первого тир-листа" />
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="surface relative rounded-2xl p-6"
              >
                <span className="font-display absolute top-4 right-5 text-5xl font-bold text-white/5">
                  0{index + 1}
                </span>
                <div className="relative">
                  <div className="font-display text-lg font-semibold text-white">{step.title}</div>
                  <p className="mt-1.5 text-sm text-slate-400">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </PageShell>
      </section>

      {trending.length > 0 ? (
        <section className="border-y border-white/6 bg-white/[0.015]">
          <PageShell className="py-16 sm:py-20">
            <SectionHeading
              eyebrow="Live со Steam"
              title="Популярное прямо сейчас"
              description="Данные обновляются в реальном времени через Steam Store."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {trending.map((item, index) => (
                <GameTile
                  key={item.appid}
                  appid={item.appid}
                  name={item.name}
                  header={item.header}
                  inCollection={false}
                  index={index}
                  onClick={() => {
                    window.location.href = `https://store.steampowered.com/app/${item.appid}`;
                  }}
                />
              ))}
            </div>
          </PageShell>
        </section>
      ) : null}

      <section>
        <PageShell className="py-16 sm:py-20">
          <SectionHeading eyebrow="Подборки" title="Куда заглянуть" />
          <div className="mb-6 flex flex-wrap gap-2">
            {CURATED_SECTIONS.map((section, index) => (
              <button
                key={section.title}
                type="button"
                onClick={() => setActiveSection(index)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                  activeSection === index
                    ? 'border-violet-400/50 bg-violet-500/15 text-white'
                    : 'border-white/10 bg-white/3 text-slate-400 hover:text-slate-200'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
          <p className="mb-5 text-sm text-slate-500">
            {CURATED_SECTIONS[activeSection].subtitle}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CURATED_SECTIONS[activeSection].games.map((game, index) => (
              <GameTile
                key={game.appid}
                appid={game.appid}
                name={game.name}
                tag={game.tag}
                compact
                index={index}
                onClick={() => {
                  window.location.href = `https://store.steampowered.com/app/${game.appid}`;
                }}
              />
            ))}
          </div>
        </PageShell>
      </section>

      {sale.length > 0 ? (
        <section className="border-t border-white/6 bg-white/[0.015]">
          <PageShell className="py-16">
            <SectionHeading eyebrow="Скидки" title="Сейчас со скидкой" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {sale.map((item, index) => (
                <GameTile
                  key={item.appid}
                  appid={item.appid}
                  name={item.name}
                  header={item.header}
                  index={index}
                  onClick={() => {
                    window.location.href = `https://store.steampowered.com/app/${item.appid}`;
                  }}
                />
              ))}
            </div>
          </PageShell>
        </section>
      ) : null}

      <section>
        <PageShell className="py-20">
          <div className="surface relative overflow-hidden rounded-3xl p-10 text-center sm:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_0%,rgba(139,92,246,0.25),transparent)]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-balance sm:text-4xl">
                Начни собирать свою библиотеку
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-400">
                Регистрация занимает 20 секунд. Добавь первую игру и опубликуй свой первый тир-лист.
              </p>
              <Link to={user ? '/collection' : '/register'} className="mt-8 inline-block">
                <Button size="lg" icon={<ArrowRight className="size-4" />}>
                  {user ? 'Перейти в коллекцию' : 'Создать аккаунт'}
                </Button>
              </Link>
            </div>
          </div>
        </PageShell>
      </section>
    </>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-1 rounded-full bg-cyan-400" />
      {label}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-violet-300/80 uppercase">
        <span className="h-px w-6 bg-linear-to-r from-violet-400 to-transparent" />
        {eyebrow}
      </div>
      <h2 className="font-display text-2xl font-bold text-balance text-white sm:text-3xl">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
    </div>
  );
}

function HeroPreview() {
  const rows = [
    { label: 'S', color: '#f43f5e', appids: [1245620, 1086940] },
    { label: 'A', color: '#fb923c', appids: [1174180, 1091500, 2050650] },
    { label: 'B', color: '#facc15', appids: [413150, 367520, 1145360, 892970] },
    { label: 'C', color: '#38bdf8', appids: [271590, 292030] },
  ];

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-4 shadow-[0_40px_120px_-40px_rgba(139,92,246,0.6)] sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-rose-400/70" />
        <span className="size-2.5 rounded-full bg-amber-400/70" />
        <span className="size-2.5 rounded-full bg-lime-400/70" />
        <span className="ml-3 font-mono text-[11px] text-slate-500">gametracker.app / my-tier-list</span>
      </div>

      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3">
            <div
              className="flex w-14 shrink-0 items-center justify-center rounded-lg border py-4 sm:w-16"
              style={{
                borderColor: `${row.color}55`,
                background: `linear-gradient(140deg, ${row.color}30, ${row.color}08)`,
              }}
            >
              <span className="font-display text-2xl font-bold" style={{ color: row.color }}>
                {row.label}
              </span>
            </div>
            <div className="flex flex-1 flex-wrap gap-2 rounded-lg border border-white/8 bg-white/2 p-2.5">
              {row.appids.map((appid, index) => (
                <div
                  key={appid}
                  className="animate-float w-24 overflow-hidden rounded-md border border-white/10 sm:w-28"
                  style={{ animationDelay: `${index * 0.6 + row.appids.length * 0.2}s` }}
                >
                  <img
                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`}
                    alt=""
                    className="h-12 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
