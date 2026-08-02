"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sliders, Star, ChevronUp, ChevronDown, Trash2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  createAlertVariation,
  updateAlertVariation,
  deleteAlertVariation,
  setDefaultVariation,
  reorderVariations,
} from "@/lib/actions/alert-variations";
import { applyTemplateToVariation, saveAsTemplate } from "@/lib/actions/alert-templates";
import { uploadAlertSoundAction } from "@/lib/actions/alert-sound";

export interface VariationRow {
  id: string;
  name: string;
  isDefault: boolean;
  priority: number;
  minAmount: number | null;
  maxAmount: number | null;
  keyword: string | null;
  soundUrl: string | null;
  gifUrl: string | null;
  durationMs: number | null;
  ttsEnabled: boolean | null;
  ttsVoice: string | null;
  ttsProviderVoiceId: string | null;
  ttsVolume: number | null;
  soundVolume: number | null;
  readName: boolean;
  readAmount: boolean;
}

export interface TemplateRow {
  id: string;
  name: string;
  previewUrl: string | null;
  soundUrl: string | null;
  gifUrl: string | null;
  durationMs: number;
  isOfficial: boolean;
}

export interface VoiceOption {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  minAmount: "",
  maxAmount: "",
  keyword: "",
  soundUrl: "",
  gifUrl: "",
  durationMs: "8000",
  ttsEnabled: true,
  ttsProviderVoiceId: "",
  ttsVolume: "100",
  soundVolume: "90",
  readName: true,
  readAmount: true,
};

function criteriaLabel(v: VariationRow): string {
  if (v.isDefault) return "Padrão — dispara quando nada mais bate";
  const parts: string[] = [];
  if (v.minAmount !== null && v.maxAmount !== null) {
    parts.push(`R$ ${v.minAmount} a R$ ${v.maxAmount}`);
  } else if (v.minAmount !== null) {
    parts.push(`a partir de R$ ${v.minAmount}`);
  } else if (v.maxAmount !== null) {
    parts.push(`até R$ ${v.maxAmount}`);
  }
  if (v.keyword) parts.push(`palavra "${v.keyword}"`);
  return parts.length > 0 ? parts.join(" · ") : "Sem critério (nunca dispara sozinha)";
}

export function VariationsPanel({
  variations,
  templates,
  voices,
}: {
  variations: VariationRow[];
  templates: TemplateRow[];
  voices: VoiceOption[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setErrors({});
    setFormError(null);
  }

  function startEdit(v: VariationRow) {
    setForm({
      name: v.name,
      minAmount: v.minAmount !== null ? String(v.minAmount) : "",
      maxAmount: v.maxAmount !== null ? String(v.maxAmount) : "",
      keyword: v.keyword ?? "",
      soundUrl: v.soundUrl ?? "",
      gifUrl: v.gifUrl ?? "",
      durationMs: String(v.durationMs ?? 8000),
      ttsEnabled: v.ttsEnabled ?? true,
      ttsProviderVoiceId: v.ttsProviderVoiceId ?? "",
      ttsVolume: String(v.ttsVolume ?? 100),
      soundVolume: String(v.soundVolume ?? 90),
      readName: v.readName,
      readAmount: v.readAmount,
    });
    setEditingId(v.id);
    setShowForm(true);
  }

  function applyTemplateLocally(t: TemplateRow) {
    setForm((f) => ({
      ...f,
      soundUrl: t.soundUrl ?? f.soundUrl,
      gifUrl: t.gifUrl ?? f.gifUrl,
      durationMs: String(t.durationMs),
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const raw = {
      name: form.name,
      minAmount: form.minAmount || undefined,
      maxAmount: form.maxAmount || undefined,
      keyword: form.keyword,
      soundUrl: form.soundUrl,
      gifUrl: form.gifUrl,
      durationMs: form.durationMs,
      ttsEnabled: form.ttsEnabled,
      ttsProviderVoiceId: form.ttsProviderVoiceId,
      ttsVolume: form.ttsVolume,
      soundVolume: form.soundVolume,
      readName: form.readName,
      readAmount: form.readAmount,
    };

    setLoading("save");
    const res = editingId
      ? await updateAlertVariation(editingId, raw)
      : await createAlertVariation(raw);
    setLoading(null);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    resetForm();
    router.refresh();
  }

  async function onRecordSound() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setFormError("Seu navegador não suporta gravação de áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = String(reader.result).split(",")[1] ?? "";
          setLoading("upload");
          const res = await uploadAlertSoundAction(base64, "audio/webm");
          setLoading(null);
          if (res.ok) {
            setForm((f) => ({ ...f, soundUrl: res.url }));
          } else {
            setFormError(res.error);
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecording(true);
      setTimeout(() => {
        recorder.stop();
        setRecording(false);
      }, 5000);
    } catch {
      setFormError("Não foi possível acessar o microfone.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const nonDefault = variations.filter((v) => !v.isDefault);
    const target = index + direction;
    if (target < 0 || target >= nonDefault.length) return;
    const ids = nonDefault.map((v) => v.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setLoading("reorder");
    await reorderVariations(ids);
    setLoading(null);
    router.refresh();
  }

  const nonDefaultVariations = variations.filter((v) => !v.isDefault);
  const defaultVariation = variations.find((v) => v.isDefault);

  return (
    <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
      <div className="mb-1 flex items-center gap-2">
        <Sliders size={16} className="text-pixflow-cyan" />
        <p className="font-medium text-pixflow-slate">Variações de alerta</p>
      </div>
      <p className="mb-4 text-xs text-white/40">
        Crie alertas diferentes por faixa de valor ou palavra-chave na mensagem — a de
        maior prioridade que bater primeiro é usada. Sem nenhuma, cai na configuração de
        aparência abaixo.
      </p>

      {templates.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
            Galeria de templates
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setShowForm(true);
                  applyTemplateLocally(t);
                }}
                className="flex-none rounded-xl border border-white/10 bg-pixflow-dark px-3 py-2 text-left text-xs text-pixflow-slate/80 hover:border-pixflow-cyan/40"
              >
                <span className="flex items-center gap-1">
                  <Sparkles size={12} className="text-pixflow-cyan" /> {t.name}
                </span>
                {t.isOfficial && <span className="text-white/30">oficial</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {formError && (
        <p className="mb-3 rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}

      <div className="mb-4 grid gap-3">
        {variations.length === 0 ? (
          <EmptyState icon={Sliders} title="Nenhuma variação ainda" hint="Usando a configuração de aparência padrão abaixo." />
        ) : (
          <>
            {nonDefaultVariations.map((v, i) => (
              <div
                key={v.id}
                className="rounded-xl border border-white/10 bg-pixflow-dark px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-pixflow-slate">{v.name}</p>
                    <p className="truncate text-xs text-white/40">{criteriaLabel(v)}</p>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded p-1 text-white/40 hover:text-pixflow-cyan disabled:opacity-20"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === nonDefaultVariations.length - 1}
                      className="rounded p-1 text-white/40 hover:text-pixflow-cyan disabled:opacity-20"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-pixflow-slate/70 hover:border-pixflow-cyan/40"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(v.id);
                        await setDefaultVariation(v.id);
                        setLoading(null);
                        router.refresh();
                      }}
                      disabled={loading === v.id}
                      className="rounded-lg border border-white/10 p-1.5 text-white/40 hover:border-pixflow-cyan hover:text-pixflow-cyan"
                      title="Definir como padrão"
                    >
                      <Star size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(v.id);
                        await deleteAlertVariation(v.id);
                        setLoading(null);
                        router.refresh();
                      }}
                      disabled={loading === v.id}
                      className="rounded-lg border border-white/10 p-1.5 text-white/40 hover:border-pixflow-magenta hover:text-pixflow-magenta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {defaultVariation && (
              <div className="rounded-xl border border-pixflow-cyan/30 bg-pixflow-cyan/5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Star size={13} className="text-pixflow-cyan" />
                    <div>
                      <p className="text-sm text-pixflow-slate">{defaultVariation.name}</p>
                      <p className="text-xs text-white/40">{criteriaLabel(defaultVariation)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(defaultVariation)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-pixflow-slate/70 hover:border-pixflow-cyan/40"
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!showForm ? (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          Nova variação
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-white/10 p-4">
          <p className="text-sm font-medium text-pixflow-slate">
            {editingId ? "Editar variação" : "Nova variação"}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Doação grande"
              />
            </Field>
            <Field label="Palavra-chave (opcional)" error={errors.keyword}>
              <Input
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                placeholder="parabéns"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor mínimo (R$, opcional)" error={errors.minAmount}>
              <Input
                type="number"
                step="0.01"
                value={form.minAmount}
                onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
                placeholder="50"
              />
            </Field>
            <Field label="Valor máximo (R$, opcional)" error={errors.maxAmount}>
              <Input
                type="number"
                step="0.01"
                value={form.maxAmount}
                onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))}
                placeholder="200"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Som do alerta (URL)" error={errors.soundUrl}>
              <Input
                value={form.soundUrl}
                onChange={(e) => setForm((f) => ({ ...f, soundUrl: e.target.value }))}
                placeholder="https://.../som.mp3"
              />
            </Field>
            <Field label="GIF/imagem (URL)" error={errors.gifUrl}>
              <Input
                value={form.gifUrl}
                onChange={(e) => setForm((f) => ({ ...f, gifUrl: e.target.value }))}
                placeholder="https://.../alerta.gif"
              />
            </Field>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={onRecordSound}
              disabled={recording || loading === "upload"}
            >
              <Upload size={14} />
              {recording ? "Gravando (5s)..." : loading === "upload" ? "Enviando..." : "Gravar som (5s)"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duração (ms)">
              <Input
                type="number"
                min="3000"
                max="30000"
                step="500"
                value={form.durationMs}
                onChange={(e) => setForm((f) => ({ ...f, durationMs: e.target.value }))}
              />
            </Field>
            <Field label="Volume do som (0-100)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.soundVolume}
                onChange={(e) => setForm((f) => ({ ...f, soundVolume: e.target.value }))}
              />
            </Field>
            <Field label="Volume da voz (0-100)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.ttsVolume}
                onChange={(e) => setForm((f) => ({ ...f, ttsVolume: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Voz avançada (ElevenLabs — opcional)" hint={voices.length === 0 ? "Sem provider configurado nesta conta ainda." : undefined}>
            <Select
              value={form.ttsProviderVoiceId}
              onChange={(e) => setForm((f) => ({ ...f, ttsProviderVoiceId: e.target.value }))}
              disabled={voices.length === 0}
            >
              <option value="">Usar voz do navegador (padrão)</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.ttsEnabled}
                onChange={(e) => setForm((f) => ({ ...f, ttsEnabled: e.target.checked }))}
              />
              Ler mensagem em voz
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.readName}
                onChange={(e) => setForm((f) => ({ ...f, readName: e.target.checked }))}
              />
              Falar nome do apoiador
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.readAmount}
                onChange={(e) => setForm((f) => ({ ...f, readAmount: e.target.checked }))}
              />
              Falar o valor
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading === "save"}>
              {loading === "save" ? "Salvando..." : editingId ? "Salvar alterações" : "Criar variação"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            {editingId && (
              <button
                type="button"
                onClick={async () => {
                  const name = prompt("Nome do template:");
                  if (!name) return;
                  await saveAsTemplate(editingId, name);
                  router.refresh();
                }}
                className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
              >
                Salvar como template
              </button>
            )}
            {editingId && templates.length > 0 && (
              <select
                className="rounded-lg border border-white/10 bg-pixflow-darker/60 px-2 py-1 text-xs text-pixflow-slate"
                defaultValue=""
                onChange={async (e) => {
                  if (!e.target.value || !editingId) return;
                  await applyTemplateToVariation(editingId, e.target.value);
                  router.refresh();
                  e.target.value = "";
                }}
              >
                <option value="">Aplicar template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
