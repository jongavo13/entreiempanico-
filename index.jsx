import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";

const INK = "#F1EBDD";
const BG = "#0B0B0D";
const SURFACE = "#15151A";

function getZone(level) {
  if (level <= 2)
    return {
      key: "branco",
      label: "Leve",
      accent: "#F1EBDD",
      badgeBg: "#F1EBDD",
      badgeText: "#0B0B0D",
      badgeBorder: "1px solid rgba(241,235,221,0.4)",
    };
  if (level <= 4)
    return {
      key: "azul",
      label: "Moderada-leve",
      accent: "#3A5C8C",
      badgeBg: "#3A5C8C",
      badgeText: "#F1EBDD",
      badgeBorder: "1px solid rgba(58,92,140,0.6)",
    };
  if (level <= 6)
    return {
      key: "dourado",
      label: "Moderada",
      accent: "#C9A227",
      badgeBg: "#C9A227",
      badgeText: "#0B0B0D",
      badgeBorder: "1px solid rgba(201,162,39,0.6)",
    };
  if (level <= 8)
    return {
      key: "vermelho",
      label: "Intensa",
      accent: "#C23B2E",
      badgeBg: "#C23B2E",
      badgeText: "#F1EBDD",
      badgeBorder: "1px solid rgba(194,59,46,0.6)",
    };
  return {
    key: "preto",
    label: "Extrema",
    accent: "#7A1C1C",
    badgeBg: "#000000",
    badgeText: "#C9A227",
    badgeBorder: "1px solid #7A1C1C",
    pulse: true,
  };
}

function formatRelativo(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `há ${diffD}d`;
  return date.toLocaleDateString("pt-BR");
}

const MAX_STORED_POSTS = 300;

export default function EntreiEmPanico() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageMissing, setStorageMissing] = useState(false);

  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  const [level, setLevel] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [justPublished, setJustPublished] = useState(false);
  const [myPostIds, setMyPostIds] = useState(() => new Set());

  const pollRef = useRef(null);

  const loadPosts = useCallback(async (silent) => {
    if (typeof window === "undefined" || !window.storage) {
      setStorageMissing(true);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await window.storage.get("posts", true);
      const parsed = res && res.value ? JSON.parse(res.value) : [];
      setPosts(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      // chave ainda não existe — primeiro acesso, lista vazia
      setPosts((prev) => (silent ? prev : []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(false);
    pollRef.current = setInterval(() => loadPosts(true), 7000);
    return () => clearInterval(pollRef.current);
  }, [loadPosts]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedStory = story.trim();
    if (!trimmedName) {
      setFormError("Escreva seu nome antes de publicar.");
      return;
    }
    if (!trimmedStory) {
      setFormError("Conte um pouco do que aconteceu.");
      return;
    }
    if (!window.storage) {
      setFormError("Armazenamento indisponível neste preview.");
      return;
    }
    setFormError("");
    setSubmitting(true);

    const newPost = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName.slice(0, 40),
      story: trimmedStory.slice(0, 800),
      level,
      createdAt: new Date().toISOString(),
    };

    try {
      let current = [];
      try {
        const res = await window.storage.get("posts", true);
        current = res && res.value ? JSON.parse(res.value) : [];
        if (!Array.isArray(current)) current = [];
      } catch (e) {
        current = [];
      }
      const updated = [newPost, ...current].slice(0, MAX_STORED_POSTS);
      const result = await window.storage.set(
        "posts",
        JSON.stringify(updated),
        true
      );
      if (!result) throw new Error("save failed");
      setPosts(updated);
      setMyPostIds((prev) => new Set(prev).add(newPost.id));
      setName("");
      setStory("");
      setLevel(5);
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 3500);
    } catch (err) {
      setFormError("Não consegui publicar agora. Tenta de novo em um instante.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.storage) return;
    try {
      const res = await window.storage.get("posts", true);
      const current = res && res.value ? JSON.parse(res.value) : [];
      const updated = Array.isArray(current)
        ? current.filter((p) => p.id !== id)
        : [];
      await window.storage.set("posts", JSON.stringify(updated), true);
      setPosts(updated);
    } catch (e) {
      // falha silenciosa — o registro continua visível até a próxima atualização
    }
  };

  const zone = getZone(level);
  const needleRotation = -90 + ((level - 1) / 9) * 180;

  return (
    <div style={{ background: BG, color: INK, minHeight: "100vh", width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Source+Serif+4:wght@400;600&display=swap');

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(194,59,46,0.55); }
          50% { box-shadow: 0 0 0 6px rgba(194,59,46,0); }
        }
        .pulse-badge { animation: pulseGlow 1.8s ease-out infinite; }

        input[type=range].epm-range {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: rgba(241,235,221,0.15);
          width: 100%;
        }
        input[type=range].epm-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #C9A227;
          border: 2px solid #0B0B0D;
          cursor: pointer;
          margin-top: 0px;
          box-shadow: 0 0 0 4px rgba(201,162,39,0.22);
        }
        input[type=range].epm-range::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #C9A227;
          border: 2px solid #0B0B0D;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(201,162,39,0.22);
        }
        input[type=range].epm-range:focus-visible,
        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible {
          outline: 2px solid #C9A227;
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <div className="max-w-xl mx-auto px-5 pb-16" style={{ paddingTop: 48 }}>
        {/* Header */}
        <header className="text-center mb-10">
          <p
            className="uppercase mb-2"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.25em",
              color: "#C9A227",
            }}
          >
            registro público de dor
          </p>
          <h1
            className="uppercase font-bold"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 40,
              letterSpacing: "0.01em",
              lineHeight: 1.05,
            }}
          >
            Entrei em Pânico?
          </h1>
          <p
            className="mt-3"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 14,
              opacity: 0.7,
              maxWidth: 360,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Um lugar pra registrar a dor que você sentiu — e quanto ela pesou.
          </p>
        </header>

        {/* Painel / formulário */}
        <section
          className="rounded-2xl mb-12"
          style={{
            border: "1px solid rgba(241,235,221,0.12)",
            background: SURFACE,
            padding: 24,
          }}
        >
          <p
            className="text-center uppercase mb-5"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "rgba(241,235,221,0.5)",
            }}
          >
            quanto isso pesou?
          </p>

          {/* Gauge */}
          <div className="relative mx-auto" style={{ width: 220, height: 120 }}>
            <div
              className="absolute overflow-hidden"
              style={{ left: 0, top: 0, width: 220, height: 110 }}
            >
              <div
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from -90deg, #F1EBDD 0% 10%, #3A5C8C 10% 20%, #C9A227 20% 30%, #C23B2E 30% 40%, #7A1C1C 40% 50%, #0B0B0D 50% 100%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at center, transparent 60%, black 61%)",
                  maskImage:
                    "radial-gradient(circle at center, transparent 60%, black 61%)",
                }}
              />
            </div>

            <span
              className="absolute"
              style={{
                left: 2,
                top: 90,
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                opacity: 0.45,
              }}
            >
              1
            </span>
            <span
              className="absolute"
              style={{
                right: 2,
                top: 90,
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                opacity: 0.45,
              }}
            >
              10
            </span>

            {/* Needle */}
            <div
              className="absolute"
              style={{
                left: 110,
                top: 110,
                width: 4,
                height: 90,
                marginLeft: -2,
                marginTop: -90,
                background: "linear-gradient(to top, #C23B2E, #F1EBDD)",
                transformOrigin: "2px 90px",
                transform: `rotate(${needleRotation}deg)`,
                transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1)",
                borderRadius: 2,
                boxShadow: "0 0 6px rgba(194,59,46,0.55)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                left: 110,
                top: 110,
                width: 14,
                height: 14,
                marginLeft: -7,
                marginTop: -7,
                background: "#C9A227",
                boxShadow: "0 0 8px rgba(201,162,39,0.7)",
              }}
            />
          </div>

          {/* Leitura numérica */}
          <div className="text-center" style={{ marginTop: 4, marginBottom: 20 }}>
            <span
              className="font-bold"
              style={{ fontFamily: "'Oswald', sans-serif", fontSize: 30, color: zone.accent }}
            >
              {level}
            </span>
            <span
              className="uppercase ml-2"
              style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.08em", color: zone.accent }}
            >
              {zone.label}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="epm-range"
            aria-label="Nível de dor, de 1 a 10"
          />

          {/* Campos */}
          <div className="mt-6 space-y-4">
            <div>
              <label
                className="block uppercase mb-1"
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.05em", color: "rgba(241,235,221,0.5)" }}
              >
                Seu nome
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Como você quer aparecer"
                className="w-full rounded-lg"
                style={{
                  background: BG,
                  border: "1px solid rgba(241,235,221,0.15)",
                  color: INK,
                  padding: "10px 12px",
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 15,
                }}
              />
            </div>

            <div>
              <label
                className="block uppercase mb-1"
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.05em", color: "rgba(241,235,221,0.5)" }}
              >
                O que aconteceu
              </label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                maxLength={800}
                rows={4}
                placeholder="Conte a história. Pode ser curta."
                className="w-full rounded-lg"
                style={{
                  background: BG,
                  border: "1px solid rgba(241,235,221,0.15)",
                  color: INK,
                  padding: "10px 12px",
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: 15,
                  resize: "vertical",
                }}
              />
              <div
                className="text-right mt-1"
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, opacity: 0.4 }}
              >
                {story.length}/800
              </div>
            </div>

            <div aria-live="polite">
              {formError && (
                <p className="flex items-center gap-1" style={{ color: "#C23B2E", fontSize: 13 }}>
                  <AlertCircle size={14} /> {formError}
                </p>
              )}
              {justPublished && (
                <p style={{ color: "#C9A227", fontSize: 13 }}>Registro publicado.</p>
              )}
              {storageMissing && (
                <p style={{ color: "#C23B2E", fontSize: 13 }}>
                  Armazenamento indisponível neste preview — abra o artifact publicado para postar de verdade.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full uppercase font-semibold rounded-lg"
              style={{
                background: "#C9A227",
                color: "#0B0B0D",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.04em",
                padding: "13px 0",
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "Publicando..." : "Publicar registro"}
            </button>
          </div>
        </section>

        {/* Feed */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2
              className="uppercase font-semibold"
              style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: "0.06em", color: "rgba(241,235,221,0.7)" }}
            >
              Registros
            </h2>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, opacity: 0.4 }}>
              {posts.length} {posts.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center" style={{ padding: "40px 0" }}>
              <Loader2 className="animate-spin" size={22} style={{ color: "#C9A227" }} />
            </div>
          ) : posts.length === 0 ? (
            <p
              className="text-center"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14, opacity: 0.6, padding: "32px 0" }}
            >
              Nenhum registro ainda. Seja a primeira pessoa a contar o que pesou.
            </p>
          ) : (
            <ul className="space-y-3">
              {posts.map((p, idx) => {
                const z = getZone(p.level);
                const num = String(posts.length - idx).padStart(3, "0");
                return (
                  <li
                    key={p.id}
                    className="rounded-lg"
                    style={{
                      background: SURFACE,
                      borderLeft: `4px solid ${z.accent}`,
                      borderTop: "1px solid rgba(241,235,221,0.06)",
                      borderRight: "1px solid rgba(241,235,221,0.06)",
                      borderBottom: "1px solid rgba(241,235,221,0.06)",
                      padding: 16,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, opacity: 0.4 }}>
                        Nº{num} · {formatRelativo(p.createdAt)}
                      </span>
                      <span
                        className={`uppercase rounded ${z.pulse ? "pulse-badge" : ""}`}
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 10,
                          letterSpacing: "0.04em",
                          background: z.badgeBg,
                          color: z.badgeText,
                          border: z.badgeBorder,
                          padding: "2px 8px",
                        }}
                      >
                        {p.level} · {z.label}
                      </span>
                    </div>
                    <p
                      className="font-semibold mb-1"
                      style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15 }}
                    >
                      {p.name}
                    </p>
                    <p
                      className="whitespace-pre-wrap"
                      style={{
                        fontFamily: "'Source Serif 4', Georgia, serif",
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "rgba(241,235,221,0.85)",
                      }}
                    >
                      {p.story}
                    </p>
                    {myPostIds.has(p.id) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="underline mt-2"
                        style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, opacity: 0.5, background: "none", border: "none", color: INK, cursor: "pointer" }}
                      >
                        remover meu registro
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer
          className="text-center mt-14 pt-6"
          style={{ borderTop: "1px solid rgba(241,235,221,0.1)" }}
        >
          <p
            className="mx-auto"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 12, opacity: 0.5, maxWidth: 340 }}
          >
            Isso aqui é um espaço pra desabafar — não substitui apoio profissional. Se a
            dor estiver pesada demais, procure alguém de confiança ou um profissional de
            saúde mental.
          </p>
        </footer>
      </div>
    </div>
  );
}
