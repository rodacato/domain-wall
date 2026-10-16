import { useState, type ReactNode } from "react";
import type { GenerationServices } from "../../application/generationServices";
import {
  DEFAULT_ANTHROPIC_MODEL,
  isUsable,
  settingsFor,
  type LlmProviderKind,
} from "../../application/llmSettings";
import { summarizeGeneration } from "../../application/summarizeGeneration";
import type { GeneratedPack } from "../../application/packLibrary";
import { PROGRAMMING_LANGUAGES } from "../../domain/language/ProgrammingLanguage";
import { PASS_IDS } from "../../domain/packGeneration/passes";
import { useI18n } from "../i18n/I18n";
import { useGeneration } from "./useGeneration";
import { useLlmSettings } from "./useLlmSettings";
import "./generation.css";

interface GenerateBusinessProps {
  readonly services: GenerationServices;
  readonly onReady: (entry: GeneratedPack) => void;
}

const MINIMUM_DESCRIPTION = 20;
const PROVIDERS: readonly LlmProviderKind[] = ["simulated", "host", "anthropic", "openai"];

/** Describe a business and watch it being generated, checked and, if need be, sent back. */
export function GenerateBusiness({ services, onReady }: GenerateBusinessProps): ReactNode {
  const { t } = useI18n();
  const [description, setDescription] = useState("");
  const [settings, setSettings] = useLlmSettings();
  const generation = useGeneration(services);
  const { state } = generation;
  const usable = isUsable(settings, services.hostOffersLlm);
  const longEnough = description.trim().length >= MINIMUM_DESCRIPTION;

  if (state.status !== "idle") {
    return <Progress generation={generation} onReady={onReady} />;
  }
  return (
    <div className="generate">
      <label className="generate__field">
        <span>{t("ui.generate.description")}</span>
        <textarea
          value={description}
          rows={4}
          maxLength={600}
          placeholder={t("ui.generate.placeholder")}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
        />
      </label>
      <div className="generate__settings">
        <label className="generate__field">
          <span>{t("ui.generate.provider.label")}</span>
          <select
            value={settings.provider}
            onChange={(event) => {
              setSettings(settingsFor(event.target.value as LlmProviderKind, settings));
            }}
          >
            {PROVIDERS.map((provider) => (
              <option
                key={provider}
                value={provider}
                disabled={provider === "host" && !services.hostOffersLlm}
              >
                {t(`ui.generate.provider.${provider}`)}
              </option>
            ))}
          </select>
        </label>
        {(settings.provider === "anthropic" || settings.provider === "openai") && (
          <>
            <label className="generate__field">
              <span>{t("ui.generate.apiKey")}</span>
              <input
                type="password"
                value={settings.apiKey}
                autoComplete="off"
                onChange={(event) => {
                  setSettings({ ...settings, apiKey: event.target.value });
                }}
              />
            </label>
            <label className="generate__field">
              <span>{t("ui.generate.model")}</span>
              <input
                value={settings.model}
                placeholder={DEFAULT_ANTHROPIC_MODEL}
                onChange={(event) => {
                  setSettings({ ...settings, model: event.target.value });
                }}
              />
            </label>
          </>
        )}
        {settings.provider === "openai" && (
          <label className="generate__field">
            <span>{t("ui.generate.baseUrl")}</span>
            <input
              value={settings.baseUrl}
              onChange={(event) => {
                setSettings({ ...settings, baseUrl: event.target.value });
              }}
            />
          </label>
        )}
      </div>
      <p className="generate__note">
        {t(settings.provider === "simulated" ? "ui.generate.simulatedNote" : "ui.generate.keyNote")}
      </p>
      <button
        className="player__button player__button--primary"
        disabled={!usable || !longEnough}
        onClick={() => {
          generation.start(description.trim(), settings);
        }}
      >
        {t("ui.generate.start")}
      </button>
      {!longEnough && (
        <p className="generate__note">
          {t("ui.generate.tooShort", { count: MINIMUM_DESCRIPTION })}
        </p>
      )}
    </div>
  );
}

function Progress({
  generation,
  onReady,
}: {
  readonly generation: ReturnType<typeof useGeneration>;
  readonly onReady: (entry: GeneratedPack) => void;
}): ReactNode {
  const { t } = useI18n();
  const { state } = generation;
  const summary = summarizeGeneration(state.status === "idle" ? [] : state.events);

  return (
    <div className="generate">
      <ol className="passes">
        {PASS_IDS.map((pass) => {
          const entry = summary.passes[pass];
          return (
            <li key={pass} className={`pass pass--${entry.status}`}>
              <strong>{t(`ui.generate.pass.${pass}`)}</strong>
              <span>
                {entry.status === "answered"
                  ? Object.entries(entry.counts)
                      .map(([part, count]) => `${count} ${t(`ui.generate.part.${part}`)}`)
                      .join(" · ")
                  : t(`ui.generate.status.${entry.status}`)}
              </span>
              {entry.schemaIssues.length > 0 && (
                <small className="pass__refused">
                  {t("ui.generate.schemaRefused", { count: entry.schemaIssues.length })}
                </small>
              )}
            </li>
          );
        })}
      </ol>

      <ul className="gates">
        <li className={`gate ${summary.passes.model.status === "answered" ? "gate--passed" : ""}`}>
          {t("ui.generate.gate.schema")}
        </li>
        <li className={`gate ${summary.meaning === "passed" ? "gate--passed" : ""}`}>
          {t("ui.generate.gate.meaning")}
        </li>
        {PROGRAMMING_LANGUAGES.map((language) => (
          <li
            key={language}
            className={`gate ${summary.code[language] === true ? "gate--passed" : ""} ${summary.code[language] === false ? "gate--failed" : ""}`}
          >
            {t(`common.programmingLanguage.${language}`)}
          </li>
        ))}
      </ul>

      {summary.refusals.map((refusal, position) => (
        <div key={position} className="refusal">
          <strong>
            {t("ui.generate.sentBack", {
              pass: t(`ui.generate.pass.${refusal.retrying}`),
              count: refusal.issues.length,
            })}
          </strong>
          <ul>
            {refusal.issues.slice(0, 3).map((issue) => (
              <li key={`${issue.ruleId}${issue.path}`}>
                <code>{issue.path}</code> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {state.status === "running" && (
        <button className="player__button" onClick={generation.cancel}>
          {t("ui.generate.cancel")}
        </button>
      )}
      {state.status === "succeeded" && (
        <>
          <p className="generate__success">
            {t(state.reused ? "ui.generate.reused" : "ui.generate.ready", {
              name: state.entry.pack.business.name.en,
            })}
          </p>
          <button
            className="player__button player__button--primary"
            onClick={() => {
              onReady(state.entry);
            }}
          >
            {t("ui.generate.use")}
          </button>
        </>
      )}
      {state.status === "failed" && (
        <>
          <p className="generate__failure">
            {state.failure.kind === "unavailable"
              ? t("ui.generate.unavailable", { message: state.failure.message })
              : state.failure.kind === "aborted"
                ? t("ui.generate.aborted")
                : t("ui.generate.exhausted", { count: state.failure.issues.length })}
          </p>
          <button className="player__button" onClick={generation.reset}>
            {t("ui.generate.again")}
          </button>
        </>
      )}
    </div>
  );
}
